import fs from "node:fs";
import path from "node:path";
import * as QRCode from "qrcode";
import z from "zod";

export const persistedStateSchema = z.object({
	serverAddressCidr: z.string(),
	serverListenPort: z.number(),
	desiredPeerCount: z.number(),
	publicEndpoint: z.string(),
	dns: z.string(),
	allowedIps: z.string(),
});

export const createArtifactPaths = (baseDir: string) => {
	const configDir = path.join(baseDir, "config");
	const peersDir = path.join(configDir, "peers");
	const qrDir = path.join(configDir, "qr");
	const stateDir = path.join(configDir, "state");
	const statePath = path.join(stateDir, "server.json");
	const rootKeyPath = path.join(stateDir, "root.key");
	const serverConfigPath = path.join(configDir, "wg0.conf");

	return {
		resetOutputDirs: async () => {
			await fs.promises.rm(configDir, { recursive: true, force: true });
			await fs.promises.mkdir(configDir, { recursive: true, mode: 0o700 });
			await fs.promises.mkdir(stateDir, { recursive: true, mode: 0o700 });
			await fs.promises.mkdir(peersDir, { recursive: true, mode: 0o700 });
			await fs.promises.mkdir(qrDir, { recursive: true, mode: 0o700 });
		},
		writeServerConfig: async (content: string) => {
			await fs.promises.writeFile(serverConfigPath, content, {
				encoding: "utf8",
				mode: 0o600,
			});
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
			const peerQrPath = path.join(qrDir, `${peerName}.png`);
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
		writeRootKey: async (content: string) => {
			await fs.promises.writeFile(rootKeyPath, content, { encoding: "utf8", mode: 0o600 });
		},
		readRootKey: async () => {
			return await fs.promises.readFile(rootKeyPath, { encoding: "utf8" });
		},
	};
};
