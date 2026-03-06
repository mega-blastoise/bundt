import type { FragmentRegistry } from '../registry/fragment-registry';
import type { DataBinding, FragmentInstance, ResolvedBinding } from '../types';

export function resolveBindings(
  bindings: DataBinding[],
  fragmentInstances: FragmentInstance[],
  fragmentRegistry: FragmentRegistry
): ResolvedBinding[] {
  const instanceMap = new Map(fragmentInstances.map((fi) => [fi.instanceId, fi]));

  return bindings.map((binding) => {
    const sourceInstance = instanceMap.get(binding.sourceFragmentInstanceId);
    if (!sourceInstance) {
      throw new Error(`Binding source instance "${binding.sourceFragmentInstanceId}" not found`);
    }

    const targetInstance = instanceMap.get(binding.targetFragmentInstanceId);
    if (!targetInstance) {
      throw new Error(`Binding target instance "${binding.targetFragmentInstanceId}" not found`);
    }

    const sourceFragment = fragmentRegistry.get(sourceInstance.fragmentId);
    if (!sourceFragment.interactions[binding.sourceInteraction]) {
      throw new Error(
        `Fragment "${sourceInstance.fragmentId}" does not have interaction "${binding.sourceInteraction}"`
      );
    }

    return {
      id: binding.id,
      sourceFragmentInstanceId: binding.sourceFragmentInstanceId,
      sourceInteraction: binding.sourceInteraction,
      targetFragmentInstanceId: binding.targetFragmentInstanceId,
      targetType: binding.targetType,
      targetKey: binding.targetKey,
      transform: binding.transform,
      sourceFragmentId: sourceInstance.fragmentId,
      targetFragmentId: targetInstance.fragmentId
    };
  });
}
