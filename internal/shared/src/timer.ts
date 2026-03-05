export function createTimer() {
  let startTime: number | null = null;
  let elapsedMs: number | null = null;

  return {
    start: (): void => {
      startTime = performance.now();
      elapsedMs = null;
    },

    stop: (): void => {
      if (startTime !== null) {
        elapsedMs = performance.now() - startTime;
        startTime = null;
      }
    },

    elapsed: (): number | null => elapsedMs,

    reset: (): void => {
      startTime = null;
      elapsedMs = null;
    }
  };
}

export function benchmark(fn: () => void, iterations: number) {
  const timings: number[] = [];

  return {
    run: (): void => {
      timings.length = 0;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        fn();
        timings.push(performance.now() - start);
      }
    },

    average: (): number => {
      if (timings.length === 0) return 0;
      const sum = timings.reduce((a, b) => a + b, 0);
      return sum / timings.length;
    },

    results: (): number[] => [...timings]
  };
}
