import path from "node:path";

export interface PeerPaths {
  index: number;
  name: string;
  dir: string;
  confPath: string;
}

export interface ArtifactPaths {
  serverConfPath: string;
  peersDir: string;
  serverDir: string;
  rootKeyPath: string;
  statePath: string;
  peers: ReadonlyArray<PeerPaths>;
}

export const createArtifactPaths = (
  outputDir: string,
  desiredPeerCount: number,
): ArtifactPaths => {
  const peers = Array.from({ length: desiredPeerCount }, (_, offset) => {
    const index = offset + 1;
    const name = `peer${index}`;
    const dir = path.join(outputDir, "peers", name);

    return {
      index,
      name,
      dir,
      confPath: path.join(dir, `${name}.conf`),
    };
  });

  return {
    serverConfPath: path.join(outputDir, "server", "wg0.conf"),
    peersDir: path.join(outputDir, "peers"),
    serverDir: path.join(outputDir, "server"),
    rootKeyPath: path.join(outputDir, "root.key"),
    statePath: path.join(outputDir, "server.json"),
    peers,
  };
};
