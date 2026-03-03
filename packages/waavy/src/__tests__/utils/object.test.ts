import { describe, test, expect } from "bun:test";
import { serialize, deserialize } from "bun:jsc";
import { createDeterministicStructure, objectIsEmpty } from "@/utils/objects";

describe("<lib/utils/object/*>", () => {
  describe("[module:objectIsEmpty]", () => {
    test("It returns true for an empty object", () => {
      const eobj = {};
      const rv = objectIsEmpty(eobj);
      expect(rv).toBeTruthy();
    });

    test("It returns false for a non empty object", () => {
      const neobj = { property: "value" };
      const rv = objectIsEmpty(neobj);
      expect(rv).toBeFalsy();
    });

    test("It returns false for objects that appear empty but have non-enumerable properties in strict mode", () => {
      const obj = {};
      Object.defineProperty(obj, "property", {
        value: 22,
        enumerable: false,
      });

      const rv = objectIsEmpty(obj, true);
      expect(Object.keys(obj).length).toBe(0);
      expect(rv).toBeFalsy();
    });
  });

  describe("[module:createDeterministicStructure]", () => {
    test("it serializes an object into a deterministic structure", () => {
      const o = {
        zeta: 100,
        gamma: [1.2, "Hello World", { b: 5, a: 6 }, [11, 22]],
        alpha: null,
      };
      const e = [
        ["alpha", null],
        [
          "gamma",
          [
            1.2,
            "Hello World",
            [
              ["a", 6],
              ["b", 5],
            ],
            [11, 22],
          ],
        ],
        ["zeta", 100],
      ];
      expect(createDeterministicStructure(o)).toEqual(e);
    });

    test("it creates equal deterministic objects of two deepEqual objects that are not the same object in memory", () => {
      const o1 = {
        zeta: {
          pig: "oink",
          cow: "moo",
          cat: "meow!",
        },
        gamma: ["reckless", "ambivalent"],
        gordianKnot: null,
        id: 101,
      };
      const o2 = {
        gordianKnot: null,
        id: 101,
        gamma: ["reckless", "ambivalent"],
        zeta: {
          pig: "oink",
          cow: "moo",
          cat: "meow!",
        },
      };

      expect(Object.is(o1, o2)).toBe(false);
      expect(createDeterministicStructure(o1)).toEqual(createDeterministicStructure(o2));
    });

    test("it creates outputs from equal inputs that are equal", () => {
      const o1 = {
        zeta: {
          pig: "oink",
          cow: "moo",
          cat: "meow!",
        },
        gamma: ["reckless", "ambivalent"],
        gordianKnot: null,
        id: 101,
      };
      const o2 = {
        gordianKnot: null,
        id: 101,
        gamma: ["reckless", "ambivalent"],
        zeta: {
          pig: "oink",
          cow: "moo",
          cat: "meow!",
        },
      };

      const d1 = createDeterministicStructure(o1);
      const d2 = createDeterministicStructure(o2);
      expect(Object.is(d1, d2)).toBe(false);
      expect(d1).toEqual(d2);

      const str1 = JSON.stringify(d1);
      const str2 = JSON.stringify(d2);
      expect(str1).toEqual(str2);

      const ser1 = serialize(d1);
      const ser2 = serialize(d2);
      expect(ser1).toEqual(ser2);
    });
  });
});
