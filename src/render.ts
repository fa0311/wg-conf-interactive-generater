export interface ServerPeerInput {
	name: string;
	publicKey: string;
	presharedKey: string;
	allowedIps: string;
}

export interface ServerConfigInput {
	address: string;
	listenPort: number;
	privateKey: string;
}

export interface PeerConfigInput {
	address: string;
	listenPort: number;
	privateKey: string;
	publicKey: string;
	presharedKey: string;
	allowedIps: string;
}

export const renderServerConfig = (input: ServerConfigInput) => {
	const data = [
		"[Interface]",
		`Address = ${input.address}`,
		`PrivateKey = ${input.privateKey}`,
		`ListenPort = ${input.listenPort}`,
		"", //
	];

	return {
		add: (input: ServerPeerInput) => {
			data.push(
				"[Peer]",
				`# ${input.name}`,
				`PublicKey = ${input.publicKey}`,
				`PresharedKey = ${input.presharedKey}`,
				`AllowedIPs = ${input.allowedIps}`,
				"",
			);
		},
		render: () => data.join("\n"),
	};
};

export const renderPeerConfig = (input: PeerConfigInput) => {
	const data = [
		"[Interface]",
		`Address = ${input.address}`,
		`ListenPort = ${input.listenPort}`,
		`PrivateKey = ${input.privateKey}`,
		"",
		"[Peer]",
		`PublicKey = ${input.publicKey}`,
		`PresharedKey = ${input.presharedKey}`,
		`AllowedIPs = ${input.allowedIps}`,
		"",
	];
	return {
		render: () => data.join("\n"),
	};
};
