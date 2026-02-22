import * as p from "@clack/prompts";
import z, { ZodError } from "zod";
import { type Cidr, cidrParser, endpointParser } from "./address.js";

type TextPromptInput<T> = {
	message: string;
	defaultValue?: string;
	validate: (value: string) => T;
};

export const textPrompt = async <T>(args: TextPromptInput<T>) => {
	const result = await p.text({
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

	if (p.isCancel(result)) {
		return result;
	}
	return args.validate(result);
};

type ListEditPromptInput<T> = {
	message: string;
	options: ListEditPromptOption<T>[];
	maxItems?: number;
};

type ListEditPromptOption<T> =
	| {
			label: string;
			value: T;
			hint?: string;
			disabled?: boolean;
	  }
	| {
			label: string;
			callback: () => Promise<T | undefined>;
			hint?: string;
			disabled?: boolean;
	  };

export const listEditPrompt = async <T>(args: ListEditPromptInput<T>) => {
	while (true) {
		const result = await p.select({
			message: args.message,
			options: args.options.map((option, i) => ({
				label: option.label,
				value: i,
				hint: option.hint,
				disabled: option.disabled,
			})),
			maxItems: args.maxItems,
		});
		if (p.isCancel(result)) {
			return;
		}
		const option = args.options[result];
		if ("value" in option) {
			return option.value;
		} else {
			const optionResult = await option.callback();
			if (optionResult !== undefined) {
				return optionResult;
			}
		}
	}
};

type ListLoopPromptInput = {
	message: string;
	options: ListLoopPromptOptions[];
	maxItems?: number;
};

type ListLoopPromptOptions = {
	label: string;
	hint?: string;
	disabled?: () => boolean;
	callback: () => Promise<boolean>;
};

export const listNestPrompt = async (args: ListLoopPromptInput) => {
	while (true) {
		const result = await p.select({
			message: args.message,
			options: args.options.map((option, i) => ({
				label: option.label,
				value: i,
				hint: option.hint,
				disabled: option.disabled?.(),
			})),
			maxItems: args.maxItems,
		});

		if (p.isCancel(result)) {
			return result;
		}

		const option = args.options[result];
		const optionResult = await option.callback();
		if (optionResult) {
			return;
		}
	}
};

const serverParser = {
	internalSubnet: (value: string) => cidrParser(z.cidrv4().parse(value)),
	serverListenPort: (value: string) => z.coerce.number().min(1).max(65535).parse(value),
	publicEndpoint: (value: string) => endpointParser(value),
	postUp: (value: string | undefined) => z.string().optional().parse(value),
	postDown: (value: string | undefined) => z.string().optional().parse(value),
};

export const promptCommonSettings = async () => {
	const publicEndpoint = await textPrompt({
		message: "Public endpoint (host:port)",
		defaultValue: "192.168.1.1:51820",
		validate: serverParser.publicEndpoint,
	});
	if (p.isCancel(publicEndpoint)) {
		return undefined;
	}

	const serverListenPort = await textPrompt({
		message: "Server listen port",
		defaultValue: String("51820"),
		validate: serverParser.serverListenPort,
	});
	if (p.isCancel(serverListenPort)) {
		return undefined;
	}

	const internalSubnet = await textPrompt({
		message: "Internal subnet (CIDR)",
		defaultValue: "10.8.0.1/24",
		validate: serverParser.internalSubnet,
	});
	if (p.isCancel(internalSubnet)) {
		return undefined;
	}

	const useIptables = await listEditPrompt<[string | undefined, string | undefined]>({
		message: "Use iptables for this peer?",
		options: [
			{
				label: "Auto (recommended)",
				value: [
					"iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE",
					"iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth+ -j MASQUERADE",
				],
			},
			{
				label: "Yes",
				callback: async () => {
					const commandUp = await textPrompt({
						message: "iptables command for postUp (use {address} as placeholder for peer IP)",
						defaultValue: `iptables -A FORWARD -i wg0 -d {address} -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE`,
						validate: z.string().min(1).parse,
					});
					if (p.isCancel(commandUp)) {
						return;
					}
					const commandDown = await textPrompt({
						message: "iptables command for postDown (use {address} as placeholder for peer IP)",
						defaultValue: `iptables -D FORWARD -i wg0 -d {address} -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE`,
						validate: z.string().min(1).parse,
					});
					if (p.isCancel(commandDown)) {
						return;
					}
					return [commandUp, commandDown];
				},
			},
			{
				label: "No",
				value: [undefined, undefined],
			},
		],
	});
	if (!useIptables) {
		return;
	}

	return {
		serverListenPort: serverListenPort,
		publicEndpoint: publicEndpoint,
		internalSubnet: internalSubnet,
		postUp: useIptables[0],
		postDown: useIptables[1],
	};
};

type CommonSettings = {
	publicEndpoint: string;
	serverListenPort: number;
	internalSubnet: string;
	postUp?: string | undefined;
	postDown?: string | undefined;
};

export const toParsedCommonSettings = (input: CommonSettings) => {
	return {
		publicEndpoint: serverParser.publicEndpoint(input.publicEndpoint),
		serverListenPort: serverParser.serverListenPort(String(input.serverListenPort)),
		internalSubnet: serverParser.internalSubnet(input.internalSubnet),
		postUp: serverParser.postUp(input.postUp),
		postDown: serverParser.postDown(input.postDown),
	};
};

export const fromParsedCommonSettings = (input: ReturnType<typeof toParsedCommonSettings>) => {
	return {
		publicEndpoint: `${input.publicEndpoint.host}:${input.publicEndpoint.port}`,
		serverListenPort: input.serverListenPort,
		internalSubnet: input.internalSubnet.toString(),
	};
};

type CommonPeerSettings = {
	internalSubnet: Cidr;
};

export const promptPeerSettings = async (defaults: CommonPeerSettings) => {
	const name = await textPrompt({
		message: "Peer name",
		validate: z.string().min(1).parse,
	});
	if (p.isCancel(name)) {
		return;
	}

	const address = await textPrompt({
		message: "Peer IP address",
		defaultValue: defaults.internalSubnet.getIp(),
		validate: z.string().refine(defaults.internalSubnet.isInRange).parse,
	});
	if (p.isCancel(address)) {
		return;
	}

	const allowedIps = await listEditPrompt<string>({
		message: "Allowed IPs (comma separated CIDR blocks)",
		options: [
			{
				label: "Allow all",
				value: "0.0.0.0/0, ::/0",
				hint: "0.0.0.0/0, ::/0",
			},
			{
				label: "Allow subnet only",
				value: defaults.internalSubnet.value,
				hint: defaults.internalSubnet.value,
			},
			{
				label: "Custom",
				callback: async () => {
					const allowedIpsInput = await textPrompt({
						message: "Allowed IPs (comma separated CIDR blocks)",
						defaultValue: defaults.internalSubnet.value,
						validate: z.string().refine((e) => z.array(z.union([z.cidrv4(), z.cidrv6()])).parse(e.split(","))).parse,
					});
					if (p.isCancel(allowedIpsInput)) {
						return;
					}
					return allowedIpsInput;
				},
			},
		],
	});
	if (!allowedIps) {
		return;
	}

	const dns = await listEditPrompt<string | undefined>({
		message: "Peer DNS",
		options: [
			{
				label: "Cloudflare DNS",
				hint: "1.1.1.1",
				value: "1.1.1.1",
			},
			{
				label: "Google DNS",
				hint: "8.8.8.8",
				value: "8.8.8.8",
			},
			{
				label: "None",
				value: undefined,
			},
			{
				label: "Custom",
				callback: async () => {
					const dnsInput = await textPrompt({
						message: "Peer DNS",
						validate: z.union([z.ipv4(), z.ipv6()]).parse,
					});
					if (p.isCancel(dnsInput)) {
						return;
					}
					return dnsInput;
				},
			},
		],
	});

	return { name, address, dns, allowedIps };
};
