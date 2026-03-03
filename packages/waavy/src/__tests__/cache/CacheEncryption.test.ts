import { test, expect, describe } from "bun:test";
import { SecureEncryption } from "@/cli/RenderAction/models/CacheEncryption";
import { createDeterministicStructure } from "@/utils";

describe("<lib/cli/RenderAction/models/CacheEncryption>", () => {
  describe("[class:SecureEncryption(AES-256-GCM)[encrypt,decrypt]]", () => {
    const testCases = [
      { name: "simple string", input: "Hello, World!" },
      { name: "empty string", input: "" },
      { name: "unicode characters", input: "🚀 Hello 世界! 🌍" },
      { name: "long text", input: "A".repeat(1000) },
      {
        name: "json data",
        input: JSON.stringify({ key: "value", number: 42, array: [1, 2, 3] }),
      },
      { name: "special characters", input: "!@#$%^&*()_+-=[]{}|;':\",./<>?" },
      { name: "multiline text", input: "Line 1\nLine 2\r\nLine 3\tTabbed" },
    ];

    test.each(testCases)("should encrypt and decrypt $name", async ({ input }) => {
      const password = "test-password-123";

      const encrypted = await SecureEncryption.encrypt(input, password);
      expect(encrypted).toBeTypeOf("string");
      expect(encrypted.length).toBeGreaterThan(0);
      expect(encrypted).not.toBe(input);

      const decrypted = await SecureEncryption.decrypt(encrypted, password);
      expect(decrypted).toBe(input);
    });

    test("should produce different ciphertexts for same input", async () => {
      const input = "Same input text";
      const password = "same-password";

      const encrypted1 = await SecureEncryption.encrypt(input, password);
      const encrypted2 = await SecureEncryption.encrypt(input, password);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = await SecureEncryption.decrypt(encrypted1, password);
      const decrypted2 = await SecureEncryption.decrypt(encrypted2, password);

      expect(decrypted1).toBe(input);
      expect(decrypted2).toBe(input);
    });

    test("should fail with wrong password", async () => {
      const input = "Secret message";
      const correctPassword = "correct-password";
      const wrongPassword = "wrong-password";

      const encrypted = await SecureEncryption.encrypt(input, correctPassword);

      await expect(SecureEncryption.decrypt(encrypted, wrongPassword)).rejects.toThrow();
    });

    test("should fail with corrupted data", async () => {
      const input = "Secret message";
      const password = "test-password";

      const encrypted = await SecureEncryption.encrypt(input, password);

      // Corrupt the encrypted data by changing a character
      const corruptedEncrypted = encrypted.slice(0, -5) + "XXXXX";

      await expect(SecureEncryption.decrypt(corruptedEncrypted, password)).rejects.toThrow();
    });

    test("should fail with invalid base64", async () => {
      const password = "test-password";
      const invalidData = "not-valid-base64!@#$";

      await expect(SecureEncryption.decrypt(invalidData, password)).rejects.toThrow();
    });

    test("should fail with truncated data", async () => {
      const input = "Secret message";
      const password = "test-password";

      const encrypted = await SecureEncryption.encrypt(input, password);
      const truncated = encrypted.slice(0, encrypted.length / 2);

      await expect(SecureEncryption.decrypt(truncated, password)).rejects.toThrow();
    });

    test("should handle different password types", async () => {
      const input = "Test message";
      const passwords = [
        "simple",
        "with spaces and symbols!@#",
        "unicode-密码-🔐",
        "very-long-password-".repeat(10),
        "1234567890",
      ];

      for (const password of passwords) {
        const encrypted = await SecureEncryption.encrypt(input, password);
        const decrypted = await SecureEncryption.decrypt(encrypted, password);
        expect(decrypted).toBe(input);
      }
    });
  });

  describe("[class:SecureEncryption(AES-256-GCM)[sha256Hash]]", () => {
    test("should generate consistent SHA-256 hashes", () => {
      const inputs = [
        "Hello, World!",
        "🚀 Hello 世界! 🌍",
        "A".repeat(1000),
        JSON.stringify({ key: "value", number: 42 }),
      ];

      inputs.forEach((input) => {
        const hash1 = SecureEncryption.sha256Hash(input);
        const hash2 = SecureEncryption.sha256Hash(input);
        expect(hash1).toBe(hash2);
      });
    });

    test("should produce different hashes for different inputs", () => {
      const input1 = "Input 1";
      const input2 = "Input 2";

      const hash1 = SecureEncryption.sha256Hash(input1);
      const hash2 = SecureEncryption.sha256Hash(input2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Integration, Performance and Edge Cases", () => {
    test("should handle large data efficiently", async () => {
      const largeInput = "Large data test ".repeat(10000); // ~150KB
      const password = "performance-test-password";

      const startTime = performance.now();
      const encrypted = await SecureEncryption.encrypt(largeInput, password);
      const encryptTime = performance.now() - startTime;

      const decryptStartTime = performance.now();
      const decrypted = await SecureEncryption.decrypt(encrypted, password);
      const decryptTime = performance.now() - decryptStartTime;

      expect(decrypted).toBe(largeInput);
      expect(encryptTime).toBeLessThan(1000); // Should complete within 1 second
      expect(decryptTime).toBeLessThan(1000);
    });

    test("should handle concurrent operations", async () => {
      const input = "Concurrent test message";
      const password = "concurrent-password";

      const promises = Array.from({ length: 10 }, async (_, i) => {
        const testInput = `${input} ${i}`;
        const encrypted = await SecureEncryption.encrypt(testInput, password);
        const decrypted = await SecureEncryption.decrypt(encrypted, password);
        return { original: testInput, decrypted };
      });

      const results = await Promise.all(promises);

      results.forEach(({ original, decrypted }) => {
        expect(decrypted).toBe(original);
      });
    });

    test("should handle binary-like data", async () => {
      // Create some binary-like data as string
      const binaryLikeData = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i)).join("");

      const password = "binary-test-password";

      const encrypted = await SecureEncryption.encrypt(binaryLikeData, password);
      const decrypted = await SecureEncryption.decrypt(encrypted, password);

      expect(decrypted).toBe(binaryLikeData);
    });

    test("integration test with sha256Hash and createDeterministicStructure", () => {
      const input1 = {
        key: "value",
        number: 42,
        array: [1, 2, 3],
        beta: {},
        gamma: { k: 1, a: 2 },
      };
      const input2 = structuredClone(input1);
      const d1 = createDeterministicStructure(input1);
      const d2 = createDeterministicStructure(input2);

      expect(d1).toEqual(d2);

      const h1 = SecureEncryption.sha256Hash(JSON.stringify(d1));
      const h2 = SecureEncryption.sha256Hash(JSON.stringify(d2));
      expect(h1).toEqual(h2);
      expect(h1).toBe(h2);
    });
  });
});
