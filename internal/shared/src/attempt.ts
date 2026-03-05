export const AttemptState = {
  IDLE: 'idle',
  IN_PROGRESS: 'in_progress',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  RETRYING: 'retrying'
} as const;
export type AttemptState = (typeof AttemptState)[keyof typeof AttemptState];

export type AttemptConfig = {
  immediate?: boolean;
  retries?: number;
  delay?: number | number[];
  onError?: (e: Error) => void;
};

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

function getDelay(delay: number | number[] | undefined, attempt: number): number {
  if (delay === undefined) return 0;
  if (typeof delay === 'number') return delay;
  return delay[Math.min(attempt, delay.length - 1)] ?? 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAttempt(
  fn: (...args: unknown[]) => void | Promise<void>,
  config?: AttemptConfig
) {
  const maxRetries = config?.retries ?? 0;
  let currentState: AttemptState = AttemptState.IDLE;

  const instance = {
    run: async (...args: unknown[]): Promise<void> => {
      currentState = AttemptState.IN_PROGRESS;
      let lastError: Error | undefined;

      for (let i = 0; i <= maxRetries; i++) {
        if (i > 0) {
          currentState = AttemptState.RETRYING;
          const ms = getDelay(config?.delay, i - 1);
          if (ms > 0) await sleep(ms);
        }
        try {
          await fn(...args);
          currentState = AttemptState.SUCCEEDED;
          return;
        } catch (e) {
          lastError = toError(e);
          config?.onError?.(lastError);
        }
      }

      currentState = AttemptState.FAILED;
      throw lastError;
    },

    runSync: (...args: unknown[]): void => {
      currentState = AttemptState.IN_PROGRESS;
      let lastError: Error | undefined;

      for (let i = 0; i <= maxRetries; i++) {
        if (i > 0) {
          currentState = AttemptState.RETRYING;
        }
        try {
          fn(...args);
          currentState = AttemptState.SUCCEEDED;
          return;
        } catch (e) {
          lastError = toError(e);
          config?.onError?.(lastError);
        }
      }

      currentState = AttemptState.FAILED;
      throw lastError;
    },

    state: (): AttemptState => currentState
  };

  if (config?.immediate) {
    instance.run();
  }

  return instance;
}
