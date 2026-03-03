import type { SerializableValue } from "@/types";
import { serialize, deserialize } from "bun:jsc";

export default class Serializer {
  public static serialize = (value: SerializableValue) => serialize(value);
  public static deserialize = (serialized: SharedArrayBuffer) => deserialize(serialized);
  public static serializable = (value: unknown) => {
    try {
      serialize(value as unknown as any);
      JSON.stringify(value);
      return true;
    } catch (e) {
      return false;
    }
  };
}
