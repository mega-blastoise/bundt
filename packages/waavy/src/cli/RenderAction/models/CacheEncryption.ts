import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export default class SecureEncryption {
  private static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return (await scryptAsync(password, salt, 32)) as Buffer;
  }

  static async encrypt(text: string, password: string): Promise<string> {
    const salt = randomBytes(16);
    const iv = randomBytes(16);
    const key = await this.deriveKey(password, salt);

    const cipher = createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine salt, iv, authTag, and encrypted data
    const result = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, "hex")]);
    return result.toString("base64");
  }

  static async decrypt(encryptedData: string, password: string): Promise<string> {
    const data = Buffer.from(encryptedData, "base64");

    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 32);
    const authTag = data.subarray(32, 48);
    const encrypted = data.subarray(48);

    const key = await this.deriveKey(password, salt);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  public static sha256Hash(text: string) {
    return new Bun.CryptoHasher("sha256").update(text).digest().toString("base64");
  }
}

export { SecureEncryption };
