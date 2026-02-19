import fs from "node:fs";
import { cancel, intro, isCancel, outro } from "@clack/prompts";
import pc from "picocolors";
import z from "zod";
import { cidrParser, endpointParser } from "./address.js";
import { createArtifactPaths } from "./artifacts.js";
import { generateRootKey, parseRootKey } from "./keys.js";
import { textPrompt } from "./prompt.js";
import { renderPeerConfig, renderServerConfig } from "./render.js";
import { parsePersistedState } from "./state.js";

const encodeKey = (value: Uint8Array): string => Buffer.from(value).toString("base64");

export const main = async (): Promise<void> => {
	intro(pc.cyan("wg-conf-wizard"));

	const outputDir = await textPrompt({
		message: "Output directory",
		defaultValue: "./generated",
		validate: z.string().min(1).parse,
	});
	if (isCancel(outputDir)) {
		return;
	}

	const statePath = createArtifactPaths(outputDir, 1).statePath;
	const persistedState = await (async () => {
		try {
			const stateText = await fs.promises.readFile(statePath, "utf8");
			const parsed = parsePersistedState(stateText);
			return parsed;
		} catch (_) {
			return undefined;
		}
	})();

	const serverAddressCidr = await textPrompt({
		message: "Server Address CIDR",
		defaultValue: persistedState?.serverAddressCidr ?? "10.8.0.1/24",
		validate: z.cidrv4().parse,
	});
	if (isCancel(serverAddressCidr)) {
		return;
	}

	const serverListenPort = await textPrompt({
		message: "Server ListenPort",
		defaultValue: persistedState?.serverListenPort ?? "51820",
		validate: z.coerce.number().min(1).max(65535).parse,
	});
	if (isCancel(serverListenPort)) {
		return;
	}

	const desiredPeerCount = await textPrompt({
		message: "Desired peer count",
		defaultValue: persistedState?.desiredPeerCount ?? "1",
		validate: z.coerce.number().min(1).parse,
	});
	if (isCancel(desiredPeerCount)) {
		return;
	}

	const publicEndpoint = await textPrompt({
		message: "Public Endpoint",
		defaultValue: persistedState?.publicEndpoint ?? "192.168.1.1:51820",
		validate: endpointParser,
	});
	if (isCancel(publicEndpoint)) {
		return;
	}

	const dns = await textPrompt({
		message: "DNS",
		defaultValue: persistedState?.dns ?? "1.1.1.1",
		validate: z.union([z.ipv4(), z.ipv6()]).parse,
	});
	if (isCancel(dns)) {
		return;
	}

	const allowedIps = await textPrompt({
		message: "AllowedIPs",
		defaultValue: persistedState?.allowedIps ?? "0.0.0.0/0",
		validate: cidrParser,
	});
	if (isCancel(allowedIps)) {
		return;
	}
};

await main();
