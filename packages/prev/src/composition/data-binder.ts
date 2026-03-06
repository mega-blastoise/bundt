import type { DataSourceRegistry } from '../registry/data-source-registry';
import type { DataFetchPlan, DataFetchStep, FragmentInstance, StructuredComposition } from '../types';

export interface DataBinder {
  buildFetchPlan(composition: StructuredComposition, instances: FragmentInstance[]): DataFetchPlan;
  executeFetchPlan(plan: DataFetchPlan): Promise<Map<string, Record<string, unknown>>>;
}

export function createDataBinder(dataSourceRegistry: DataSourceRegistry): DataBinder {
  function buildFetchPlan(composition: StructuredComposition, instances: FragmentInstance[]): DataFetchPlan {
    const steps: DataFetchStep[] = [];

    for (let i = 0; i < composition.fragments.length; i++) {
      const compFragment = composition.fragments[i]!;
      const instance = instances[i]!;

      if (!compFragment.data) continue;

      for (const [dataKey, binding] of Object.entries(compFragment.data)) {
        if (!dataSourceRegistry.has(binding.source)) {
          throw new Error(`Data source "${binding.source}" not found for fragment "${compFragment.fragmentId}"`);
        }

        steps.push({
          dataSourceId: binding.source,
          params: binding.params,
          targetFragmentInstanceId: instance.instanceId,
          targetDataKey: dataKey
        });
      }
    }

    return { steps };
  }

  async function executeFetchPlan(plan: DataFetchPlan): Promise<Map<string, Record<string, unknown>>> {
    const results = new Map<string, Record<string, unknown>>();
    const completedSteps = new Set<string>();

    const independent = plan.steps.filter((s) => !s.dependsOn?.length);
    const dependent = plan.steps.filter((s) => s.dependsOn?.length);

    const executeStep = async (step: DataFetchStep): Promise<void> => {
      const ds = dataSourceRegistry.get(step.dataSourceId);
      const result = await ds.fetch(step.params);

      const existing = results.get(step.targetFragmentInstanceId) ?? {};
      existing[step.targetDataKey] = result;
      results.set(step.targetFragmentInstanceId, existing);

      const stepKey = `${step.targetFragmentInstanceId}:${step.targetDataKey}`;
      completedSteps.add(stepKey);
    };

    await Promise.all(independent.map(executeStep));

    for (const step of dependent) {
      const depsReady = step.dependsOn!.every((dep) => completedSteps.has(dep));
      if (!depsReady) {
        throw new Error(`Unresolved dependency for step targeting ${step.targetFragmentInstanceId}:${step.targetDataKey}`);
      }
      await executeStep(step);
    }

    return results;
  }

  return { buildFetchPlan, executeFetchPlan };
}
