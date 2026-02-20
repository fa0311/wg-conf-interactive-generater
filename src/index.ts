import * as p from "@clack/prompts";
import pc from "picocolors";
import z from "zod";
import { cidrParser, endpointParser } from "./address.js";
import { createArtifactPaths, persistedStateSchema } from "./artifacts.js";
import { encodeKey, generateRootKey, parseRootKey } from "./keys.js";
import { textPrompt } from "./prompt.js";
import { renderPeerConfig, renderServerConfig } from "./render.js";

export const main = async (): Promise<void> => {
	p.intro(pc.cyan("wg-conf-wizard"));

	const outputDir = await textPrompt({
		message: "Output directory",
		defaultValue: "./generated",
		validate: z.string().min(1).parse,
	});
	if (p.isCancel(outputDir)) {
		return;
	}

	const artifactPaths = createArtifactPaths(outputDir);

	const persistedState = await (async () => {
		try {
			const state = await artifactPaths.readState();
			return persistedStateSchema.parse(state);
		} catch (_) {
			return undefined;
		}
	})();

	const serverAddressCidr = await textPrompt({
		message: "Server Address CIDR",
		defaultValue: persistedState?.serverAddressCidr ?? "10.8.0.1/24",
		validate: (e) => cidrParser(z.cidrv4().parse(e)),
	});
	if (p.isCancel(serverAddressCidr)) {
		return;
	}

	const serverListenPort = await textPrompt({
		message: "Server ListenPort",
		defaultValue: String(persistedState?.serverListenPort ?? "51820"),
		validate: z.coerce.number().min(1).max(65535).parse,
	});
	if (p.isCancel(serverListenPort)) {
		return;
	}

	const desiredPeerCount = await textPrompt({
		message: "Desired peer count",
		defaultValue: String(persistedState?.desiredPeerCount ?? "1"),
		validate: z.coerce.number().min(1).parse,
	});
	if (p.isCancel(desiredPeerCount)) {
		return;
	}

	const publicEndpoint = await textPrompt({
		message: "Public Endpoint",
		defaultValue: persistedState?.publicEndpoint ?? "192.168.1.1:51820",
		validate: endpointParser,
	});
	if (p.isCancel(publicEndpoint)) {
		return;
	}

	const dns = await textPrompt({
		message: "DNS",
		defaultValue: persistedState?.dns ?? "1.1.1.1",
		validate: z.union([z.ipv4(), z.ipv6()]).parse,
	});
	if (p.isCancel(dns)) {
		return;
	}

	const allowedIps = await textPrompt({
		message: "AllowedIPs",
		defaultValue: persistedState?.allowedIps ?? "0.0.0.0/0",
		validate: z.cidrv4().parse,
	});
	if (p.isCancel(allowedIps)) {
		return;
	}

	const rootKeyText = await (async () => {
		try {
			return await artifactPaths.readRootKey();
		} catch (_) {
			return generateRootKey();
		}
	})();

	const rootKeyOps = parseRootKey(Buffer.from(rootKeyText, "base64"));

	const serverKeys = rootKeyOps.deriveServerKeyPair();
	const endpointText = `${publicEndpoint.host}:${publicEndpoint.port}`;
	const serverConfig = renderServerConfig({
		address: serverAddressCidr.getIp(),
		listenPort: 51820,
		privateKey: encodeKey(serverKeys.privateKey),
	});

	const peers = Array.from({ length: desiredPeerCount }, (_, i) => {
		const keyMaterial = rootKeyOps.derivePeerKeyMaterial(i);
		const presharedKey = rootKeyOps.derivePeerPresharedKey(i);
		const ip = serverAddressCidr.getIp();
		const name = `peer${i + 1}`;
		serverConfig.add({
			name: name,
			publicKey: encodeKey(keyMaterial.publicKey),
			presharedKey: encodeKey(presharedKey),
			allowedIps: `${ip}/32`,
		});
		return {
			name: name,
			render: renderPeerConfig({
				address: ip,
				listenPort: serverListenPort,
				privateKey: encodeKey(keyMaterial.privateKey),
				publicKey: encodeKey(serverKeys.publicKey),
				presharedKey: encodeKey(presharedKey),
				allowedIps: allowedIps,
			}),
		};
	});

	await artifactPaths.cleanup();
	await artifactPaths.writeRootKey(rootKeyText);
	await artifactPaths.writeServerConfig(serverConfig.render());
	await Promise.all(peers.map((peer) => artifactPaths.writePeerConfig(peer.name, peer.render.render())));

	await artifactPaths.writeState({
		serverAddressCidr: serverAddressCidr.value,
		serverListenPort: serverListenPort,
		desiredPeerCount: desiredPeerCount,
		publicEndpoint: endpointText,
		dns: dns,
		allowedIps: allowedIps,
	});

	p.outro(pc.green("Done."));
};

await main();
