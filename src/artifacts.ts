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

export const createArtifactPaths = async (outputDir: string) => {
	const peerDir = path.join(outputDir, "peers");
	const statePath = path.join(outputDir, "server.json");
	const rootKeyPath = path.join(outputDir, "root.key");
	const configPath = path.join(outputDir, "config.conf");

	await fs.promises.mkdir(outputDir, { recursive: true });
	
	return {
		writeServerConfig: async (content: string) => {
			await fs.promises.writeFile(configPath, content, "utf8");
			await fs.promises.chmod(configPath, 0o600);
		},
		setupPeerDir: async () => {
			await fs.promises.rm(peerDir, { recursive: true, force: true });
			await fs.promises.mkdir(peerDir, { recursive: true });
		},
		writePeerConfig: async (peerName: string, content: string) => {
			const peerConfigPath = path.join(peerDir, `${peerName}.conf`);
			await fs.promises.writeFile(peerConfigPath, content, "utf8");
			await fs.promises.chmod(peerConfigPath, 0o600);
		},
		writeState: async (content: z.infer<typeof persistedStateSchema>) => {
			const data = JSON.stringify(content, null, 2);
			await fs.promises.writeFile(statePath, data, "utf8");
			await fs.promises.chmod(statePath, 0o600);
		},
		readState: async () => {
			const data = await fs.promises.readFile(statePath, "utf8");
			return JSON.parse(data);
		},
		writeRootKey: async (content: string) => {
			await fs.promises.writeFile(rootKeyPath, content, "utf8");
			await fs.promises.chmod(rootKeyPath, 0o600);
		},
		readRootKey: async () => {
			return await fs.promises.readFile(rootKeyPath, "utf8");
		},
	};
};
