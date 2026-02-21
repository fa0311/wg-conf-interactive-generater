import { describe, expect, it } from "vitest";
import { generateKeypair, generatePresharedKey } from "../src/keys";

const decodeB64 = (value: string): Uint8Array => Buffer.from(value, "base64");

describe("keys", () => {
  it("generates 32-byte key material", () => {
    const keypair = generateKeypair();
    const presharedKey = generatePresharedKey();

    expect(decodeB64(keypair.privateKey)).toHaveLength(32);
    expect(decodeB64(keypair.publicKey)).toHaveLength(32);
    expect(decodeB64(presharedKey)).toHaveLength(32);
  });

  it("derives deterministic public key from a provided private key", () => {
    const seed = new Uint8Array(32);
    seed[0] = 7;
    seed[31] = 128;
    const seedB64 = Buffer.from(seed).toString("base64");

    const first = generateKeypair(seedB64);
    const second = generateKeypair(seedB64);

    expect(first.privateKey).toBe(seedB64);
    expect(first.publicKey).toBe(second.publicKey);
  });
});
