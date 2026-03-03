import { type SerializableObject } from "@/types";
import { serializable, serialize } from "./serde";
import { deterministicStringify } from "./strings";

function createDeterministicProps(props: SerializableObject) {
  return JSON.parse(deterministicStringify(props));
}

export function serializeProps<Props extends SerializableObject>(props: Props): SharedArrayBuffer | null {
  if (props && typeof props === "object" && serializable(props)) {
    const dpo = createDeterministicProps(props);
    return serialize(dpo);
  }

  return null;
}
