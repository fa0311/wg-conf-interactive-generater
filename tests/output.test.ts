import { describe, expect, it } from "vitest";
import { createArtifactPaths } from "../src/artifacts";
import { parsePersistedState, resolvePromptDefaults } from "../src/state";

describe("index helpers", () => {
  it("creates peer artifact paths without png outputs", () => {
    const paths = createArtifactPaths("./generated", 2);

    expect(paths.serverConfPath).toBe("generated/server/wg0.conf");
    expect(paths.peersDir).toBe("generated/peers");
    expect(paths.peers).toHaveLength(2);
    expect(paths.peers[0]?.confPath).toBe("generated/peers/peer1/peer1.conf");
    expect(Object.keys(paths.peers[0] ?? {})).not.toContain("qrPath");
  });

  it("parses persisted state and applies defaults", () => {
    const parsed = parsePersistedState(
      JSON.stringify({
        serverAddressCidr: "10.8.0.1/24",
        serverListenPort: 51820,
        desiredPeerCount: 3,
        publicEndpoint: "vpn.example.com:51820",
        dns: "9.9.9.9",
        allowedIps: "0.0.0.0/0",
      }),
    );

    expect(parsed).toBeDefined();

    const defaults = resolvePromptDefaults(parsed);
    expect(defaults.serverListenPort).toBe("51820");
    expect(defaults.desiredPeerCount).toBe("3");
    expect(defaults.publicEndpoint).toBe("vpn.example.com:51820");
  });

  it("returns undefined for corrupted persisted state", () => {
    expect(parsePersistedState("{invalid-json")).toBeUndefined();
  });
});
