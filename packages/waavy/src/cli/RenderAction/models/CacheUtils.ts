import { buffersAreEqual } from "../utils/cache/utils/serde";

export default class CacheUtils {
  public static compare<T = SharedArrayBuffer | object>(a: T, b: T): boolean {
    if (a instanceof SharedArrayBuffer && b instanceof SharedArrayBuffer) {
      return buffersAreEqual(a, b);
    }

    return Bun.deepEquals(a, b, true);
  }
}
