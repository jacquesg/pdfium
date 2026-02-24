function mergeClassNames(...tokens: Array<string | null | undefined | false>): string | undefined {
  const value = tokens.filter(Boolean).join(' ');
  return value.length > 0 ? value : undefined;
}

function requireContextValue<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

function getMissingContextMessage(hookName: string, parentComponentName: string): string {
  return `${hookName}() must be called inside a <${parentComponentName}> component.`;
}

export { getMissingContextMessage, mergeClassNames, requireContextValue };
