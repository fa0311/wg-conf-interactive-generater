import * as p from "@clack/prompts";
import pc from "picocolors";
import z from "zod";
import { createArtifactPaths, persistedStateSchema } from "./artifacts.js";
import { generateKeypair, generatePresharedKey } from "./keys.js";
import { promptCommonSettings, textPrompt, toParsedCommonSettings } from "./prompt.js";
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

	const { serverAddressCidr, publicEndpoint, serverListenPort, dns, allowedIps } = serverCommonSettings;

	const serverKeys = generateKeypair(state?.privateKey);
	const endpointText = `${publicEndpoint.host}:${publicEndpoint.port}`;
	const serverConfig = renderServerConfig({
		address: serverAddressCidr.getIp(),
		listenPort: 51820,
		privateKey: serverKeys.privateKey,
	});

	const peers = state?.peer ?? [];

	for (const peer of peers) {
		serverAddressCidr.addDisallowIp(peer.address);
	}
	await artifactPaths.resetOutputDirs();

	await (async () => {
		while (true) {
			const addPeer = await p.select({
				options: [
					{ value: "add", label: "Add peer" },
					...(peers.length > 0 ? [{ value: "remove", label: "Remove peer" }] : []),
					{ value: "done", label: "Done" },
				],
				message: "What do you want to do?",
			});

			if (p.isCancel(addPeer)) {
				return;
			} else if (addPeer === "done") {
				return;
			} else if (addPeer === "add") {
				const peerName = await textPrompt({
					message: "Peer name",
					validate: z.string().min(1).parse,
				});
				if (p.isCancel(peerName)) {
					continue;
				}
				const presharedKey = generatePresharedKey();
				const peerKeypair = generateKeypair();

				const address = serverAddressCidr.getIp();

				peers.push({
					address: address,
					name: peerName,
					publicKey: peerKeypair.publicKey,
					presharedKey: presharedKey,
				});

				const peerConfig = renderPeerConfig({
					address: address,
					listenPort: serverListenPort,
					privateKey: peerKeypair.privateKey,
					publicKey: serverKeys.publicKey,
					presharedKey: presharedKey,
					allowedIps: allowedIps,
				});
				const configText = peerConfig.render();

				await artifactPaths.writePeerConfig(peerName, configText);
				await artifactPaths.writePeerQr(peerName, configText);

				serverConfig.add({
					name: peerName,
					publicKey: peerKeypair.publicKey,
					presharedKey: presharedKey,
					allowedIps: `${address}/32`,
				});
			} else if (addPeer === "remove") {
				const peerToRemove = await p.select({
					options: [...peers.map((peer) => ({ value: peer.name, label: peer.name }))],
					message: "Select a peer to remove",
				});
				if (p.isCancel(peerToRemove)) {
					continue;
				}
				const index = peers.findIndex((peer) => peer.name === peerToRemove);
				peers.splice(index, 1);
			}
		}
	})();

	await artifactPaths.writeState({
		serverAddressCidr: serverAddressCidr.value,
		serverListenPort: serverListenPort,
		publicEndpoint: endpointText,
		dns: dns,
		allowedIps: allowedIps,
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
