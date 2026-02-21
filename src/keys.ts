import { randomBytes } from "node:crypto";
import nacl from "tweetnacl";

const clampX25519PrivateKey = (sk: Uint8Array) => {
	sk[0] &= 248;
	sk[31] &= 127;
	sk[31] |= 64;
	return sk;
};

function toB64(u8: Uint8Array) {
	return Buffer.from(u8).toString("base64");
}

export const generateKeypair = (key?: string) => {
	const privateKey = key ? Buffer.from(key, "base64") : clampX25519PrivateKey(nacl.randomBytes(32));
	const publicKey = nacl.scalarMult.base(privateKey);
	return { privateKey: toB64(privateKey), publicKey: toB64(publicKey) };
};

export const generatePresharedKey = (): string => {
	return randomBytes(32).toString("base64");
};
