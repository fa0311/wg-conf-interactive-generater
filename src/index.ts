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

	const serverAddressCidr = await textPrompt({
		message: "Server address (CIDR)",
		defaultValue: state?.serverAddressCidr ?? "10.8.0.1/24",
		validate: (e) => cidrParser(z.cidrv4().parse(e)),
	});
	if (p.isCancel(serverAddressCidr)) {
		return;
	}

	const serverListenPort = await textPrompt({
		message: "Server listen port",
		defaultValue: String(state?.serverListenPort ?? "51820"),
		validate: z.coerce.number().min(1).max(65535).parse,
	});
	if (p.isCancel(serverListenPort)) {
		return;
	}

	const desiredPeerCount = await textPrompt({
		message: "Peer count",
		defaultValue: String(state?.desiredPeerCount ?? "1"),
		validate: z.coerce.number().min(1).parse,
	});
	if (p.isCancel(desiredPeerCount)) {
		return;
	}

	const publicEndpoint = await textPrompt({
		message: "Public endpoint (host:port)",
		defaultValue: state?.publicEndpoint ?? "192.168.1.1:51820",
		validate: endpointParser,
	});
	if (p.isCancel(publicEndpoint)) {
		return;
	}

	const dns = await textPrompt({
		message: "DNS server",
		defaultValue: state?.dns ?? "1.1.1.1",
		validate: z.union([z.ipv4(), z.ipv6()]).parse,
	});
	if (p.isCancel(dns)) {
		return;
	}

	const allowedIps = await textPrompt({
		message: "Allowed IPs (CIDR)",
		defaultValue: state?.allowedIps ?? "0.0.0.0/0",
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
		const peerConfig = renderPeerConfig({
			address: ip,
			listenPort: serverListenPort,
			privateKey: encodeKey(keyMaterial.privateKey),
			publicKey: encodeKey(serverKeys.publicKey),
			presharedKey: encodeKey(presharedKey),
			allowedIps: allowedIps,
		});
		return {
			name: name,
			configText: peerConfig.render(),
		};
	});

	await artifactPaths.resetOutputDirs();
	await artifactPaths.writeRootKey(rootKeyText);
	await artifactPaths.writeServerConfig(serverConfig.render());
	await Promise.all(
		peers.map(async (peer) => {
			await artifactPaths.writePeerConfig(peer.name, peer.configText);
			await artifactPaths.writePeerQr(peer.name, peer.configText);
		}),
	);

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
