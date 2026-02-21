import fs from "node:fs";
import path from "node:path";
import * as QRCode from "qrcode";
import z from "zod";

export const persistedStateSchema = z.object({
	serverAddressCidr: z.string(),
	serverListenPort: z.number(),
	publicEndpoint: z.string(),
	dns: z.string(),
	allowedIps: z.string(),
	privateKey: z.string(),
	peer: z.array(
		z.object({
			address: z.string(),
			name: z.string(),
			publicKey: z.string(),
			presharedKey: z.string(),
		}),
	),
});

export const createArtifactPaths = (baseDir: string) => {
	const peersDir = path.join(baseDir, "peers");
	const statePath = path.join(baseDir, "server.json");
	const serverConfigPath = path.join(baseDir, "wg0.conf");

	return {
		resetOutputDirs: async () => {
			await fs.promises.mkdir(baseDir, { recursive: true, mode: 0o700 });
			await fs.promises.mkdir(peersDir, { recursive: true, mode: 0o700 });
		},
		writeServerConfig: async (content: string) => {
			await fs.promises.writeFile(serverConfigPath, content, { encoding: "utf8", mode: 0o600 });
		},
		writePeerConfig: async (peerName: string, content: string) => {
			const peerConfigPath = path.join(peersDir, `${peerName}.conf`);
			await fs.promises.writeFile(peerConfigPath, content, { encoding: "utf8", mode: 0o600 });
		},
		writePeerQr: async (peerName: string, content: string) => {
			const buffer = await QRCode.toBuffer(content, {
				type: "png",
				errorCorrectionLevel: "M",
			});
			const peerQrPath = path.join(peersDir, `${peerName}.png`);
			await fs.promises.writeFile(peerQrPath, buffer, { mode: 0o600 });
		},
		writeState: async (content: z.infer<typeof persistedStateSchema>) => {
			const data = JSON.stringify(content, null, 2);
			await fs.promises.writeFile(statePath, data, { encoding: "utf8", mode: 0o600 });
		},
		readState: async () => {
			const data = await fs.promises.readFile(statePath, { encoding: "utf8" });
			return JSON.parse(data);
		},
	};
};
