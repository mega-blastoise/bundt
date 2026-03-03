import type { SerializableValue } from "@/types";
import { serialize as bun_serialize, deserialize as bun_deserialize } from "bun:jsc";

/**
 * Checks if props can be serialized using Bun's JSC serializer
 */
export function serializable(props: unknown): boolean {
  try {
    // This will throw if attempting to clone a non-serializable object, i.e. functions
    bun_serialize(props);
    JSON.stringify(props);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Compares two SharedArrayBuffer objects for equality by comparing their bytes
 */
export function buffersAreEqual(a: SharedArrayBuffer, b: SharedArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;

  const viewOfA = new DataView(a);
  const viewOfB = new DataView(b);

  // Compare 4 bytes at a time for performance
  const uint32Count = Math.floor(a.byteLength / 4);
  for (let i = 0; i < uint32Count; i++) {
    if (viewOfA.getUint32(i * 4) !== viewOfB.getUint32(i * 4)) {
      return false;
    }
  }

  // Handle remaining bytes (overflow from uin32 checks above)
  for (let byte = uint32Count * 4; byte < a.byteLength; byte++) {
    if (viewOfA.getUint8(byte) !== viewOfB.getUint8(byte)) {
      return false;
    }
  }

  return true;
}

export const serialize = (value: SerializableValue) => bun_serialize(value);
export const deserialize = <T>(serialized: SharedArrayBuffer): T => bun_deserialize(serialized);
