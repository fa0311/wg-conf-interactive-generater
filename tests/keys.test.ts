import { describe, expect, it } from "vitest";
import { generateRootKey, parseRootKey } from "../src/keys";

const decodeRootKey = (value: string): Uint8Array =>
  Buffer.from(value, "base64");

describe("keys", () => {
  it("parses valid root key and returns operations", () => {
    const rootKeyBytes = decodeRootKey(generateRootKey());
    const ops = parseRootKey(rootKeyBytes);

    expect(ops).toHaveProperty("deriveServerKeyPair");
    expect(ops).toHaveProperty("derivePeerKeyMaterial");
    expect(ops).toHaveProperty("derivePeerPresharedKey");
    expect(ops).toHaveProperty("getRootKey");
  });

  it("returns the same root key bytes from getRootKey", () => {
    const rootKeyBytes = decodeRootKey(generateRootKey());
    const ops = parseRootKey(rootKeyBytes);

    expect(ops.getRootKey()).toEqual(rootKeyBytes);
  });

  it("derives deterministic key material", () => {
    const rootKeyBytes = decodeRootKey(generateRootKey());
    const first = parseRootKey(rootKeyBytes);
    const second = parseRootKey(rootKeyBytes);

    expect(first.deriveServerKeyPair()).toEqual(second.deriveServerKeyPair());
    expect(first.derivePeerKeyMaterial(1)).toEqual(
      second.derivePeerKeyMaterial(1),
    );
    expect(first.derivePeerPresharedKey(1)).toEqual(
      second.derivePeerPresharedKey(1),
    );
  });

  it("derives 32-byte key material", () => {
    const rootKeyBytes = decodeRootKey(generateRootKey());
    const ops = parseRootKey(rootKeyBytes);

    const server = ops.deriveServerKeyPair();
    const peer = ops.derivePeerKeyMaterial(1);
    const presharedKey = ops.derivePeerPresharedKey(1);

    expect(server.privateKey).toBeInstanceOf(Uint8Array);
    expect(server.publicKey).toBeInstanceOf(Uint8Array);
    expect(peer.privateKey).toBeInstanceOf(Uint8Array);
    expect(peer.publicKey).toBeInstanceOf(Uint8Array);
    expect(presharedKey).toBeInstanceOf(Uint8Array);
    expect(server.privateKey).toHaveLength(32);
    expect(server.publicKey).toHaveLength(32);
    expect(peer.privateKey).toHaveLength(32);
    expect(peer.publicKey).toHaveLength(32);
    expect(presharedKey).toHaveLength(32);
  });
});
