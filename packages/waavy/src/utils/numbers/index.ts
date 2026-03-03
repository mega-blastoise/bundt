export function asOptionalNumber(data?: string | number): number | undefined {
  if (typeof data === "number") return data;
  if (typeof data === "string") {
    let value = undefined;
    try {
      if (data.startsWith("0x")) {
        value = parseInt(data.trim(), 16);
      } else {
        value = parseInt(data.trim(), 10);
      }

      if (isNaN(value)) return undefined;

      return value;
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}
