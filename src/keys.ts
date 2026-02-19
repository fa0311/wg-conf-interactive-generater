import { hkdfSync, randomBytes } from "node:crypto";
import { x25519 } from "@noble/curves/ed25519.js";

const WG_KEY_BYTES = 32;
const HKDF_SALT = Buffer.from("wg-conf-wizard-v1", "utf8");

const toBase64 = (value: Uint8Array): string =>
  Buffer.from(value).toString("base64");

export const generateRootKey = (): string =>
  toBase64(randomBytes(WG_KEY_BYTES));

export const parseRootKey = (rootKey: Uint8Array) => {
  const deriveKeyPair = (label: string) => {
    const privateKeyBytes = deriveBytes(label);
    const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);

    return {
      privateKey: privateKeyBytes,
      publicKey: publicKeyBytes,
    };
  };

  const deriveBytes = (label: string): Uint8Array => {
    const derived = hkdfSync(
      "sha256",
      rootKey,
      HKDF_SALT,
      Buffer.from(label, "utf8"),
      WG_KEY_BYTES,
    );

    return Uint8Array.from(Buffer.from(derived));
  };

  return {
    deriveServerKeyPair: () => {
      return deriveKeyPair("server:private");
    },
    derivePeerKeyMaterial: (index: number) => {
      return deriveKeyPair(`peer:${index}:private`);
    },
    derivePeerPresharedKey: (index: number) => {
      return deriveBytes(`peer:${index}:psk`);
    },
    getRootKey: () => rootKey,
  };
};
