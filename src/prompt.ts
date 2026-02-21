import * as p from "@clack/prompts";
import { isCancel, text } from "@clack/prompts";
import z, { ZodError } from "zod";
import { cidrParser, endpointParser } from "./address.js";

type TextPromptInput<T> = {
	message: string;
	defaultValue?: string;
	validate: (value: string) => T;
};

export const textPrompt = async <T>(args: TextPromptInput<T>) => {
	const result = await text({
		message: args.message,
		defaultValue: args.defaultValue,
		placeholder: args.defaultValue,
		initialValue: args.defaultValue,
		validate: (value) => {
			try {
				if (value === undefined) {
					if (args.defaultValue === undefined) {
						return "Input is required.";
					}
					return undefined;
				}
				args.validate(value);
			} catch (e) {
				if (e instanceof ZodError) {
					return e.issues.at(0)?.message ?? "Invalid input.";
				}
				if (e instanceof Error) {
					return e.message;
				}
				return "Invalid input.";
			}
		},
	});

	if (isCancel(result)) {
		return result;
	}
	return args.validate(result);
};

const toParse = {
	serverAddressCidr: (value: string) => cidrParser(z.cidrv4().parse(value)),
	serverListenPort: (value: string) => z.coerce.number().min(1).max(65535).parse(value),
	publicEndpoint: (value: string) => endpointParser(value),
	dns: (value: string) => z.union([z.ipv4(), z.ipv6()]).parse(value),
	allowedIps: (value: string) => z.cidrv4().parse(value),
};

type CommonSettings = {
	serverAddressCidr: string;
	serverListenPort: number;
	publicEndpoint: string;
	dns: string;
	allowedIps: string;
};

export const promptCommonSettings = async (defaults?: Partial<CommonSettings>) => {
	const serverAddressCidr = await textPrompt({
		message: "Server address (CIDR)",
		defaultValue: defaults?.serverAddressCidr ?? "10.8.0.1/24",
		validate: toParse.serverAddressCidr,
	});
	if (p.isCancel(serverAddressCidr)) {
		return undefined;
	}

	const serverListenPort = await textPrompt({
		message: "Server listen port",
		defaultValue: String(defaults?.serverListenPort ?? "51820"),
		validate: toParse.serverListenPort,
	});
	if (p.isCancel(serverListenPort)) {
		return undefined;
	}

	const publicEndpoint = await textPrompt({
		message: "Public endpoint (host:port)",
		defaultValue: defaults?.publicEndpoint ?? "192.168.1.1:51820",
		validate: toParse.publicEndpoint,
	});
	if (p.isCancel(publicEndpoint)) {
		return undefined;
	}

	const dns = await textPrompt({
		message: "DNS server",
		defaultValue: defaults?.dns ?? "1.1.1.1",
		validate: toParse.dns,
	});
	if (p.isCancel(dns)) {
		return undefined;
	}

	const allowedIps = await textPrompt({
		message: "Allowed IPs (CIDR)",
		defaultValue: defaults?.allowedIps ?? "0.0.0.0/0",
		validate: toParse.allowedIps,
	});
	if (p.isCancel(allowedIps)) {
		return undefined;
	}

	return {
		serverAddressCidr: serverAddressCidr,
		serverListenPort: serverListenPort,
		publicEndpoint: publicEndpoint,
		dns: dns,
		allowedIps: allowedIps,
	};
};

export const toParsedCommonSettings = (input: CommonSettings) => {
	return {
		serverAddressCidr: toParse.serverAddressCidr(input.serverAddressCidr),
		serverListenPort: toParse.serverListenPort(String(input.serverListenPort)),
		publicEndpoint: toParse.publicEndpoint(input.publicEndpoint),
		dns: toParse.dns(input.dns),
		allowedIps: toParse.allowedIps(input.allowedIps),
	};
};

export const fromParsedCommonSettings = (input: ReturnType<typeof toParsedCommonSettings>) => {
	return {
		serverAddressCidr: input.serverAddressCidr.toString(),
		serverListenPort: input.serverListenPort,
		publicEndpoint: `${input.publicEndpoint.host}:${input.publicEndpoint.port}`,
		dns: input.dns,
		allowedIps: input.allowedIps.toString(),
	};
};
