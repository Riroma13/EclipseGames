import type Database from 'better-sqlite3';

export function runTransaction<T>(database: Database.Database, operation: () => T): T {
  return database.transaction(operation)();
}

const gemSourceTxBrand: unique symbol = Symbol('gem-source-transaction');
export type GemSourceTx = Readonly<{
  db: Database.Database;
  mode: 'IMMEDIATE';
  correlationId: string;
  [gemSourceTxBrand]: true;
}>;

const activeTokens = new WeakSet<object>();
const activeDatabases = new WeakSet<object>();

export function assertGemSourceTransaction(token: GemSourceTx): void {
  if (!activeTokens.has(token)) throw new Error('Gem source transaction token is not active.');
}

export function runImmediateTransaction<T>(database: Database.Database, correlationId: string, work: (tx: GemSourceTx) => T): T {
  if (activeDatabases.has(database)) throw new Error('Nested immediate transaction is not allowed.');
  return database.transaction(() => {
    const token = Object.freeze({ db: database, mode: 'IMMEDIATE' as const, correlationId, [gemSourceTxBrand]: true as const });
    activeDatabases.add(database);
    activeTokens.add(token);
    try { return work(token); } finally { activeTokens.delete(token); activeDatabases.delete(database); }
  }).immediate();
}
