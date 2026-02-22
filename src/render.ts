export interface ServerPeerInput {
	name: string;
	publicKey: string;
	presharedKey: string;
	allowedIps: string;
}

export interface ServerConfigInput {
	address: string;
	listenPort: number;
	postUp: string | undefined;
	postDown: string | undefined;
	privateKey: string;
}

export interface PeerConfigInput {
	address: string;
	listenPort: number;
	privateKey: string;
	dns: string | undefined;

	publicKey: string;
	presharedKey: string;
	allowedIps: string;
	endpoint: string;
}

export const renderServerConfig = (input: ServerConfigInput) => {
	const data = [] as string[];

	data.push("[Interface]");
	data.push(`Address = ${input.address}`);
	data.push(`ListenPort = ${input.listenPort}`);
	data.push(`PrivateKey = ${input.privateKey}`);
	if (input.postUp) {
		data.push(`PostUp = ${input.postUp}`);
	}
	if (input.postDown) {
		data.push(`PostDown = ${input.postDown}`);
	}
	data.push("");

	return {
		add: (input: ServerPeerInput) => {
			data.push("[Peer]");
			data.push(`# ${input.name}`);
			data.push(`PublicKey = ${input.publicKey}`);
			data.push(`PresharedKey = ${input.presharedKey}`);
			data.push(`AllowedIPs = ${input.allowedIps}`);
			data.push("");
		},
		render: () => data.join("\n"),
	};
};

export const renderPeerConfig = (input: PeerConfigInput) => {
	const data = [] as string[];
	data.push("[Interface]");
	data.push(`Address = ${input.address}`);
	data.push(`ListenPort = ${input.listenPort}`);
	data.push(`PrivateKey = ${input.privateKey}`);
	data.push(`DNS = ${input.dns}`);
	data.push("");
	data.push("[Peer]");
	data.push(`PublicKey = ${input.publicKey}`);
	data.push(`PresharedKey = ${input.presharedKey}`);
	data.push(`AllowedIPs = ${input.allowedIps}`);
	data.push(`Endpoint = ${input.endpoint}`);
	data.push("");

	return {
		render: () => data.join("\n"),
	};
};
