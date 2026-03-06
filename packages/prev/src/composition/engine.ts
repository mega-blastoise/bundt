import type { DataSourceRegistry } from '../registry/data-source-registry';
import type { FragmentRegistry } from '../registry/fragment-registry';
import type {
  CompositionRequest,
  CompositionResult,
  Frame,
  FrameMutation,
  FragmentInstance,
  MutateFrameResult,
  StructuredComposition
} from '../types';
import { resolveBindings } from './binding-resolver';
import { createDataBinder } from './data-binder';
import { resolveIntent } from './intent-resolver';
import { solveLayout } from './layout-solver';

export interface CompositionEngine {
  compose(request: StructuredComposition, sessionId: string): Promise<CompositionResult>;
  composeFromRequest(request: CompositionRequest, sessionId: string): Promise<CompositionResult>;
  mutateFrame(frame: Frame, mutations: FrameMutation[], resolvedData: Map<string, Record<string, unknown>>): Promise<MutateFrameResult & { frame: Frame; resolvedData: Map<string, Record<string, unknown>> }>;
}

export function createCompositionEngine(
  fragmentRegistry: FragmentRegistry,
  dataSourceRegistry: DataSourceRegistry
): CompositionEngine {
  const dataBinder = createDataBinder(dataSourceRegistry);

  async function compose(request: StructuredComposition, sessionId: string): Promise<CompositionResult> {
    for (const frag of request.fragments) {
      if (!fragmentRegistry.has(frag.fragmentId)) {
        throw new Error(`Fragment "${frag.fragmentId}" not found in registry`);
      }
    }

    const instances: FragmentInstance[] = request.fragments.map((frag) => {
      const def = fragmentRegistry.get(frag.fragmentId);
      return {
        instanceId: crypto.randomUUID(),
        fragmentId: frag.fragmentId,
        props: frag.props ?? {},
        dataBindings: frag.data ?? {},
        position: frag.position,
        size: frag.size,
        layoutHints: def.layoutHints
      };
    });

    const layout = solveLayout(instances, request.layout);

    for (const instance of instances) {
      const position = layout.positions.get(instance.instanceId);
      if (position) {
        instance.position = position;
      }
    }

    const fetchPlan = dataBinder.buildFetchPlan(request, instances);
    const resolvedData = await dataBinder.executeFetchPlan(fetchPlan);

    const bindings = request.bindings ?? [];
    const resolvedBindings = resolveBindings(bindings, instances, fragmentRegistry);

    const frame: Frame = {
      id: crypto.randomUUID(),
      sessionId,
      layout,
      fragments: instances,
      bindings,
      createdAt: Date.now(),
      intent: request.intent
    };

    return { frame, resolvedData, resolvedBindings };
  }

  async function composeFromRequest(request: CompositionRequest, sessionId: string): Promise<CompositionResult> {
    if (request.type === 'intent') {
      const structured = resolveIntent(request.composition, fragmentRegistry, dataSourceRegistry);
      return compose(structured, sessionId);
    }
    return compose(request.composition, sessionId);
  }

  async function mutateFrame(
    frame: Frame,
    mutations: FrameMutation[],
    existingData: Map<string, Record<string, unknown>>
  ): Promise<MutateFrameResult & { frame: Frame; resolvedData: Map<string, Record<string, unknown>> }> {
    const newFragments = [...frame.fragments];
    const newBindings = [...frame.bindings];
    const newData = new Map(existingData);
    let applied = 0;
    const failed: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i]!;
      try {
        switch (mutation.action) {
          case 'add': {
            if (!fragmentRegistry.has(mutation.fragmentId)) {
              throw new Error(`Fragment "${mutation.fragmentId}" not found`);
            }
            const def = fragmentRegistry.get(mutation.fragmentId);
            const instance: FragmentInstance = {
              instanceId: crypto.randomUUID(),
              fragmentId: mutation.fragmentId,
              props: mutation.props ?? {},
              dataBindings: mutation.data ?? {},
              position: mutation.position,
              layoutHints: def.layoutHints
            };
            newFragments.push(instance);

            // Fetch data for the new fragment
            if (mutation.data) {
              const instanceData: Record<string, unknown> = {};
              for (const [key, binding] of Object.entries(mutation.data)) {
                if (dataSourceRegistry.has(binding.source)) {
                  const ds = dataSourceRegistry.get(binding.source);
                  instanceData[key] = await ds.fetch(binding.params);
                }
              }
              newData.set(instance.instanceId, instanceData);
            }
            applied++;
            break;
          }
          case 'remove': {
            const idx = newFragments.findIndex((f) => f.instanceId === mutation.instanceId);
            if (idx === -1) throw new Error(`Instance "${mutation.instanceId}" not found`);
            newFragments.splice(idx, 1);
            newData.delete(mutation.instanceId);
            applied++;
            break;
          }
          case 'replace': {
            const idx = newFragments.findIndex((f) => f.instanceId === mutation.instanceId);
            if (idx === -1) throw new Error(`Instance "${mutation.instanceId}" not found`);
            if (!fragmentRegistry.has(mutation.newFragmentId)) {
              throw new Error(`Fragment "${mutation.newFragmentId}" not found`);
            }
            const def = fragmentRegistry.get(mutation.newFragmentId);
            const old = newFragments[idx]!;
            newFragments[idx] = {
              instanceId: old.instanceId,
              fragmentId: mutation.newFragmentId,
              props: mutation.props ?? {},
              dataBindings: mutation.data ?? old.dataBindings,
              position: old.position,
              size: old.size,
              layoutHints: def.layoutHints
            };
            applied++;
            break;
          }
          case 'resize': {
            const inst = newFragments.find((f) => f.instanceId === mutation.instanceId);
            if (!inst) throw new Error(`Instance "${mutation.instanceId}" not found`);
            if (inst.position) {
              if (mutation.size.rowSpan !== undefined) inst.position.rowSpan = mutation.size.rowSpan;
              if (mutation.size.colSpan !== undefined) inst.position.colSpan = mutation.size.colSpan;
            }
            applied++;
            break;
          }
          case 'bind': {
            newBindings.push({
              id: crypto.randomUUID(),
              sourceFragmentInstanceId: mutation.source.fragmentInstanceId,
              sourceInteraction: mutation.source.interaction,
              targetFragmentInstanceId: mutation.target.fragmentInstanceId,
              targetType: mutation.target.prop ? 'prop' : 'dataParam',
              targetKey: mutation.target.prop ?? mutation.target.dataParam ?? '',
              transform: mutation.source.field
            });
            applied++;
            break;
          }
          case 'unbind': {
            const bIdx = newBindings.findIndex((b) => b.id === mutation.bindingId);
            if (bIdx === -1) throw new Error(`Binding "${mutation.bindingId}" not found`);
            newBindings.splice(bIdx, 1);
            applied++;
            break;
          }
        }
      } catch (err) {
        failed.push({ index: i, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const newLayout = solveLayout(newFragments, frame.layout.type);
    for (const inst of newFragments) {
      const pos = newLayout.positions.get(inst.instanceId);
      if (pos) inst.position = pos;
    }

    // Re-apply resize mutations after layout solving
    for (const mutation of mutations) {
      if (mutation.action === 'resize') {
        const inst = newFragments.find((f) => f.instanceId === mutation.instanceId);
        if (inst?.position) {
          if (mutation.size.rowSpan !== undefined) inst.position.rowSpan = mutation.size.rowSpan;
          if (mutation.size.colSpan !== undefined) inst.position.colSpan = mutation.size.colSpan;
        }
      }
    }

    const newFrame: Frame = {
      id: crypto.randomUUID(),
      sessionId: frame.sessionId,
      layout: newLayout,
      fragments: newFragments,
      bindings: newBindings,
      createdAt: Date.now(),
      intent: frame.intent
    };

    return { frameId: newFrame.id, applied, failed, frame: newFrame, resolvedData: newData };
  }

  return { compose, composeFromRequest, mutateFrame };
}
