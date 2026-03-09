import type { AnnotationType } from '../../../core/types.js';
import type { ToolConfigKey, ToolConfigMap } from '../types.js';

export interface UseAnnotationStylePresetsOptions {
  readonly effectiveType: AnnotationType;
  readonly localBorderWidth: number;
  readonly onToolConfigChange?:
    | (<T extends ToolConfigKey>(tool: T, config: Partial<ToolConfigMap[T]>) => void)
    | undefined;
}
