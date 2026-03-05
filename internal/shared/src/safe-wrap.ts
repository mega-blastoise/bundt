export const SafeFunctionState = {
  IDLE: 'idle',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed'
} as const;
export type SafeFunctionState =
  (typeof SafeFunctionState)[keyof typeof SafeFunctionState];

export type SafeResult<T> = {
  data: T | null;
  error: Error | null;
  state: SafeFunctionState;
};

export function safeWrap<T>(
  fn: (...args: unknown[]) => T
): (...args: unknown[]) => SafeResult<T> {
  return (...args) => {
    try {
      const data = fn(...args);
      return { data, error: null, state: SafeFunctionState.SUCCEEDED };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { data: null, error, state: SafeFunctionState.FAILED };
    }
  };
}

export function safeWrapAsync<T>(
  fn: (...args: unknown[]) => Promise<T>
): (...args: unknown[]) => Promise<SafeResult<T>> {
  return async (...args) => {
    try {
      const data = await fn(...args);
      return { data, error: null, state: SafeFunctionState.SUCCEEDED };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { data: null, error, state: SafeFunctionState.FAILED };
    }
  };
}
