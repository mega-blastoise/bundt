import { describe, expect, beforeEach, afterEach, test } from "bun:test";
import { writeFile, mkdtemp, rmdir } from "fs/promises";
import { tmpdir } from "os";
import path, { join } from "path";
import { load } from "@/utils";

describe("<lib/utils/index.ts::[module:load]>", () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "test-load-"));
    testFilePath = join(tempDir, "test-module.mjs");
  });

  afterEach(async () => {
    try {
      await rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  });

  test("should load default export from absolute path", async () => {
    const testCode = 'export default { message: "hello world" };';
    await writeFile(testFilePath, testCode, "utf8");
    const result = await load(testFilePath);
    expect(result).toEqual({ message: "hello world" });
  });

  test("should load named export", async () => {
    const testCode = 'export const myFunction = () => "test"; export default "default";';
    await writeFile(testFilePath, testCode, "utf8");
    const result = await load(testFilePath, "myFunction");
    expect(typeof result).toBe("function");
    expect(result()).toBe("test");
  });

  test('should load default export when name is "default"', async () => {
    const testCode = 'export default { value: 42 }; export const other = "other";';
    await writeFile(testFilePath, testCode, "utf8");
    const result = await load(testFilePath, "default");
    expect(result).toEqual({ value: 42 });
  });

  test("should return null for non-existent named export", async () => {
    const testCode = 'export default "test";';
    await writeFile(testFilePath, testCode, "utf8");
    const result = await load(testFilePath, "nonExistent");
    expect(result).toBeNull();
  });

  test("should handle relative paths from cwd", async () => {
    const relativePath = path.relative(process.cwd(), testFilePath);
    const testCode = 'export default "relative test";';
    await writeFile(testFilePath, testCode, "utf8");
    const result = await load(relativePath);
    expect(result).toBe("relative test");
  });

  test("should throw error for non-existent file", async () => {
    const nonExistentPath = join(tempDir, "does-not-exist.mjs");
    await expect(load(nonExistentPath)).rejects.toThrow();
  });

  test("should handle modules with syntax errors", async () => {
    const invalidCode = "export default { invalid syntax here";
    await writeFile(testFilePath, invalidCode, "utf8");
    await expect(load(testFilePath)).rejects.toThrow();
  });
});
