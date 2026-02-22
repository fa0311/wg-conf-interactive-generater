import * as p from "@clack/prompts";
import pc from "picocolors";
import z from "zod";
import { createArtifactPaths, persistedStateSchema } from "./artifacts.js";
import { generateKeypair, generatePresharedKey } from "./keys.js";
import { listNestPrompt, promptCommonSettings, promptPeerSettings, textPrompt, toParsedCommonSettings } from "./prompt.js";
import { renderPeerConfig, renderServerConfig } from "./render.js";

export const main = async (): Promise<void> => {
	p.intro(pc.cyan("wg-conf-wizard"));

	const baseDir = await textPrompt({
		message: "Base output directory (a `config/` folder will be created)",
		defaultValue: "./generated",
		validate: z.string().min(1).parse,
	});
	if (p.isCancel(baseDir)) {
		return;
	}

	const artifactPaths = createArtifactPaths(baseDir);

	const state = await (async () => {
		try {
			const data = await artifactPaths.readState();
			return persistedStateSchema.parse(data);
		} catch (_) {
			return undefined;
		}
	})();

	const serverCommonSettings = await (async () => {
		if (state) {
			return toParsedCommonSettings(state);
		} else {
			return promptCommonSettings();
		}
	})();
	if (!serverCommonSettings) {
		return;
	}

	const { internalSubnet, publicEndpoint, serverListenPort, postUp, postDown } = serverCommonSettings;

	const serverKeys = generateKeypair(state?.privateKey);
	const endpointText = `${publicEndpoint.host}:${publicEndpoint.port}`;
	const serverConfig = renderServerConfig({
		address: internalSubnet.value,
		listenPort: 51820,
		privateKey: serverKeys.privateKey,
		postUp: postUp,
		postDown: postDown,
	});

	const peers = state?.peer ?? [];

	for (const peer of peers) {
		internalSubnet.addDisallowIp(peer.address);
	}
	await artifactPaths.resetOutputDirs();

	const peerPrompt = await listNestPrompt({
		options: [
			{
				label: "Add peer",
				callback: async () => {
					const peerSettings = await promptPeerSettings({
						internalSubnet: internalSubnet,
					});
					if (!peerSettings) {
						return false;
					}
					const { name, address, dns, allowedIps } = peerSettings;

					const presharedKey = generatePresharedKey();
					const peerKeypair = generateKeypair();

					peers.push({
						name: name,
						address: address,
						publicKey: peerKeypair.publicKey,
						presharedKey: presharedKey,
					});

					const peerConfig = renderPeerConfig({
						address: address,
						listenPort: serverListenPort,
						privateKey: peerKeypair.privateKey,
						dns: dns,
						publicKey: serverKeys.publicKey,
						presharedKey: presharedKey,
						allowedIps: allowedIps,
						endpoint: endpointText,
					});
					const configText = peerConfig.render();

					await artifactPaths.writePeerConfig(name, configText);
					return false;
				},
			},
			{
				label: "Remove peer",
				disabled: () => peers.length === 0,
				callback: async () => {
					const peerToRemove = await p.select({
						options: [...peers.map((peer) => ({ value: peer.name, label: peer.name }))],
						message: "Select a peer to remove",
					});
					if (p.isCancel(peerToRemove)) {
						return false;
					}
					const index = peers.findIndex((peer) => peer.name === peerToRemove);
					peers.splice(index, 1);
					await artifactPaths.removePeerConfig(peerToRemove);
					return false;
				},
			},
			{
				label: "Done",
				callback: async () => true,
			},
		],
		message: "What do you want to do?",
	});
	if (p.isCancel(peerPrompt)) {
		return;
	}

	for (const peer of peers) {
		serverConfig.add({
			name: peer.name,
			publicKey: peer.publicKey,
			presharedKey: peer.presharedKey,
			allowedIps: `${peer.address}/32`,
		});
	}

	await artifactPaths.writeState({
		internalSubnet: internalSubnet.value,
		serverListenPort: serverListenPort,
		publicEndpoint: endpointText,
		privateKey: serverKeys.privateKey,
		peer: peers.map((peer) => ({
			name: peer.name,
			address: peer.address,
			publicKey: peer.publicKey,
			presharedKey: peer.presharedKey,
		})),
	});
	await artifactPaths.writeServerConfig(serverConfig.render());

	p.outro(pc.green("Done."));
};

await main();
