const symbolWithExplicitResourceManagement = Symbol as typeof Symbol & {
  dispose?: symbol;
  asyncDispose?: symbol;
};

if (symbolWithExplicitResourceManagement.dispose === undefined) {
  Object.defineProperty(Symbol, 'dispose', {
    value: Symbol.for('Symbol.dispose'),
    configurable: true,
  });
}

if (symbolWithExplicitResourceManagement.asyncDispose === undefined) {
  Object.defineProperty(Symbol, 'asyncDispose', {
    value: Symbol.for('Symbol.asyncDispose'),
    configurable: true,
  });
}

export {};
