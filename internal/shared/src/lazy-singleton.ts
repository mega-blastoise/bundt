export function createLazySingleton<T>(
  factory: (...args: unknown[]) => T
) {
  let instance: T | undefined;

  return {
    getInstance: (...args: unknown[]): T => {
      if (instance === undefined) {
        instance = factory(...args);
      }
      return instance;
    },

    hasInstance: (): boolean => instance !== undefined,

    clearInstance: (): void => {
      instance = undefined;
    }
  };
}
