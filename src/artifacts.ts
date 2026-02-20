import fs from "node:fs";
import path from "node:path";
import z from "zod";

export const persistedStateSchema = z.object({
	serverAddressCidr: z.string(),
	serverListenPort: z.number(),
	desiredPeerCount: z.number(),
	publicEndpoint: z.string(),
	dns: z.string(),
	allowedIps: z.string(),
});

export const createArtifactPaths = (value: string) => {
	const outputDir = path.join(value, "config");
	const peerDir = path.join(outputDir, "peers");
	const persistedDir = path.join(outputDir, "persisted");
	const statePath = path.join(persistedDir, "server.json");
	const rootKeyPath = path.join(persistedDir, "root.key");
	const configPath = path.join(outputDir, "config.conf");

	return {
		cleanup: async () => {
			await fs.promises.rm(outputDir, { recursive: true, force: true });
			await fs.promises.mkdir(outputDir, { recursive: true, mode: 0o700 });
			await fs.promises.mkdir(persistedDir, { recursive: true, mode: 0o700 });
			await fs.promises.mkdir(peerDir, { recursive: true, mode: 0o700 });
		},
		writeServerConfig: async (content: string) => {
			await fs.promises.writeFile(configPath, content, { encoding: "utf8", mode: 0o600 });
		},
		writePeerConfig: async (peerName: string, content: string) => {
			const peerConfigPath = path.join(peerDir, `${peerName}.conf`);
			await fs.promises.writeFile(peerConfigPath, content, { encoding: "utf8", mode: 0o600 });
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
