export function resolveOptionalPatchValue<T>(base: T | undefined, incoming: T | undefined): T | undefined {
  return incoming === undefined ? base : incoming;
}

export function buildOptionalPatchProperty<Key extends string, Value>(
  key: Key,
  value: Value | undefined,
): Partial<Record<Key, Value>> {
  if (value === undefined) {
    return {};
  }
  return { [key]: value } as Record<Key, Value>;
}
