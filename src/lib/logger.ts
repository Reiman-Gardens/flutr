const isDev = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: unknown[]) => isDev && console.log(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
  error: (...args: unknown[]) => isDev && console.error(...args),
  info: (...args: unknown[]) => isDev && console.info(...args),
};
