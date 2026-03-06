export function createThenableQuery<T>(rows: T[]) {
  type QueryBuilder = {
    from: jest.Mock<QueryBuilder, []>;
    where: jest.Mock<QueryBuilder, []>;
    innerJoin: jest.Mock<QueryBuilder, []>;
    limit: jest.Mock<QueryBuilder, []>;
    then: Promise<T[]>["then"];
    catch: Promise<T[]>["catch"];
  };

  const builder = {} as QueryBuilder;

  builder.from = jest.fn(() => builder);
  builder.where = jest.fn(() => builder);
  builder.innerJoin = jest.fn(() => builder);
  builder.limit = jest.fn(() => builder);

  builder.then = (onFulfilled, onRejected) => Promise.resolve(rows).then(onFulfilled, onRejected);
  builder.catch = (onRejected) => Promise.resolve(rows).catch(onRejected);

  return builder;
}
