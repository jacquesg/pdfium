import type { AnnotationSelection, ToolConfigKey, ToolConfigMap } from '../types.js';

export function mergeToolConfig<T extends ToolConfigKey>(
  configs: ToolConfigMap,
  tool: T,
  partial: Partial<ToolConfigMap[T]>,
): ToolConfigMap {
  const merged: ToolConfigMap[T] = { ...configs[tool], ...partial };
  const result: { -readonly [K in keyof ToolConfigMap]: ToolConfigMap[K] } = { ...configs };
  result[tool] = merged;
  return result;
}

export function selectionsMatch(current: AnnotationSelection | null, next: AnnotationSelection | null): boolean {
  if (current === next) return true;
  if (current === null || next === null) return false;
  return current.pageIndex === next.pageIndex && current.annotationIndex === next.annotationIndex;
}
