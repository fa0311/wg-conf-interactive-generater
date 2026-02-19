export interface ServerPeerInput {
  name: string;
  publicKey: string;
  presharedKey: string;
  allowedIps: string;
}

export interface ServerConfigInput {
  addressCidr: string;
  listenPort: number;
  privateKey: string;
  peers: ReadonlyArray<ServerPeerInput>;
}

export interface PeerConfigInput {
  addressCidr: string;
  listenPort: number;
  privateKey: string;
  dns: string;
  serverPublicKey: string;
  presharedKey: string;
  endpoint: string;
  allowedIps: string;
}

export const renderServerConfig = (input: ServerConfigInput): string => {
  const peerBlocks = input.peers.flatMap((peer) => [
    "[Peer]",
    `# ${peer.name}`,
    `PublicKey = ${peer.publicKey}`,
    `PresharedKey = ${peer.presharedKey}`,
    `AllowedIPs = ${peer.allowedIps}`,
    "",
  ]);

  return [
    "[Interface]",
    `Address = ${input.addressCidr}`,
    `ListenPort = ${input.listenPort}`,
    `PrivateKey = ${input.privateKey}`,
    "",
    ...peerBlocks,
  ].join("\n");
};

export const renderPeerConfig = (input: PeerConfigInput): string =>
  [
    "[Interface]",
    `Address = ${input.addressCidr}`,
    `ListenPort = ${input.listenPort}`,
    `PrivateKey = ${input.privateKey}`,
    `DNS = ${input.dns}`,
    "",
    "[Peer]",
    `PublicKey = ${input.serverPublicKey}`,
    `PresharedKey = ${input.presharedKey}`,
    `Endpoint = ${input.endpoint}`,
    `AllowedIPs = ${input.allowedIps}`,
    "",
  ].join("\n");
