/**
 * Transaction-capable DB mocking, extending the `createThenableQuery`
 * philosophy already used by `mockDb.ts` for read-only query tests: methods
 * are `jest.fn()`s returning the same chain object, and the chain resolves to
 * a canned value when awaited. `createChainable` generalizes that pattern to
 * also cover `insert().values().returning()`, `update().set().where()`, and
 * `delete().where().returning()` chains, and `createMockTx` gives each of
 * `select`/`insert`/`update`/`delete` its own `jest.fn()` so a test can stub
 * the exact sequence of calls the function under test is known to issue
 * (ordered canned responses — not generic WHERE-clause evaluation, matching
 * how every other query test in this codebase already works).
 */

const CHAINABLE_METHODS = [
  "from",
  "where",
  "limit",
  "offset",
  "groupBy",
  "orderBy",
  "innerJoin",
  "leftJoin",
  "for",
  "values",
  "set",
  "returning",
  "as",
] as const;

type ChainMethod = (typeof CHAINABLE_METHODS)[number];

export type Chainable<T> = {
  [K in ChainMethod]: jest.Mock<Chainable<T>, unknown[]>;
} & {
  then: Promise<T>["then"];
  catch: Promise<T>["catch"];
};

/**
 * A chainable, thenable query/mutation stub. Every chain method returns the
 * same object (so any call order/length resolves), and awaiting it resolves
 * to `result` — mirroring what a real Drizzle call eventually resolves to,
 * whether or not `.returning()` was part of the real chain.
 */
export function createChainable<T>(result: T): Chainable<T> {
  const chain = {} as Chainable<T>;

  for (const method of CHAINABLE_METHODS) {
    chain[method] = jest.fn(() => chain);
  }

  chain.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected);
  chain.catch = (onRejected) => Promise.resolve(result).catch(onRejected);

  return chain;
}

export type MockTx = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

/** A fresh fake `tx` (or `db`) with independently-stubbable select/insert/update/delete. */
export function createMockTx(): MockTx {
  return {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
