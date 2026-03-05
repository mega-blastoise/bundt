export type OptionState = 'idle' | 'resolved' | 'rejected';

export type Outcome<T> = {
  state: OptionState;
  data: T | null;
  error?: Error;
};

export type OptionConfig = {
  retries?: number;
};

function makeIdle<T>(): Outcome<T> {
  return { state: 'idle', data: null };
}

function executeWithRetries<T>(
  fn: () => T,
  retries: number
): Outcome<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= retries; i++) {
    try {
      const data = fn();
      return { state: 'resolved', data };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  return { state: 'rejected', data: null, error: lastError };
}

async function executeWithRetriesAsync<T>(
  fn: () => T | Promise<T>,
  retries: number
): Promise<Outcome<T>> {
  let lastError: Error | undefined;
  for (let i = 0; i <= retries; i++) {
    try {
      const data = await fn();
      return { state: 'resolved', data };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  return { state: 'rejected', data: null, error: lastError };
}

export function createOption<T>(
  fn: () => T | Promise<T>,
  config?: OptionConfig
) {
  const retries = config?.retries ?? 0;
  let current: Outcome<T> = makeIdle();

  return {
    resolve: async (): Promise<Outcome<T>> => {
      current = await executeWithRetriesAsync(fn, retries);
      return current;
    },

    resolveSync: (): Outcome<T> => {
      current = executeWithRetries(fn as () => T, retries);
      return current;
    },

    match: async <R>(
      some: (o: Outcome<T>) => R,
      none: (o: Outcome<T>) => R
    ): Promise<R> => {
      const outcome = await executeWithRetriesAsync(fn, retries);
      current = outcome;
      return outcome.state === 'resolved' ? some(outcome) : none(outcome);
    },

    matchSync: <R>(
      some: (o: Outcome<T>) => R,
      none: (o: Outcome<T>) => R
    ): R => {
      const outcome = executeWithRetries(fn as () => T, retries);
      current = outcome;
      return outcome.state === 'resolved' ? some(outcome) : none(outcome);
    },

    peek: (): Outcome<T> => current
  };
}
