export const InvocationState = { IDLE: 0, SUCCESS: 1, FAILED: 2 } as const;
export type InvocationState =
  (typeof InvocationState)[keyof typeof InvocationState];

export type SyncResult<T> =
  | { data: T; error: null; status: typeof InvocationState.SUCCESS }
  | { data: null; error: Error; status: typeof InvocationState.FAILED };

export type AsyncResult<T> =
  | { data: T; error: null; resolved: true; rejected: false }
  | { data: null; error: Error; resolved: false; rejected: true };

export function invoke<T>(fn: () => T): SyncResult<T> {
  try {
    const data = fn();
    return { data, error: null, status: InvocationState.SUCCESS };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return { data: null, error, status: InvocationState.FAILED };
  }
}

export async function invokeAsync<T>(
  fn: () => Promise<T>
): Promise<AsyncResult<T>> {
  try {
    const data = await fn();
    return { data, error: null, resolved: true, rejected: false };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return { data: null, error, resolved: false, rejected: true };
  }
}
