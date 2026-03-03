import { describe, test, expect } from "bun:test";
import { asOptionalNumber } from "@/utils/numbers";

describe("<lib/utils/numbers/*>", () => {
  describe("[module:asOptionalNumber]", () => {
    test("It returns a number when passed a number", () => {
      const n = 42;
      const rv = asOptionalNumber(n);
      expect(rv).toBe(n);
    });

    test("It returns a number when passed a string that can be parsed as a number", () => {
      const n = "42";
      const rv = asOptionalNumber(n);
      expect(rv).toBe(42);
    });

    test("It returns undefined when passed an undefined value", () => {
      const rv = asOptionalNumber(undefined);
      expect(rv).toBeUndefined();
    });

    test("It returns undefined when passed a string that cannot be parsed as a number", () => {
      const n = "not a number";
      const rv = asOptionalNumber(n);
      expect(rv).toBeUndefined();
    });
  });
});
