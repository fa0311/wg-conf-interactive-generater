import { describe, expect, it } from "vitest";
import { renderPeerConfig, renderServerConfig } from "../src/render";

describe("render", () => {
  it("renders server config with peer blocks and preshared keys", () => {
    const serverConfig = renderServerConfig({
      addressCidr: "10.8.0.1/24",
      listenPort: 51820,
      privateKey: "serverPrivate",
      peers: [
        {
          name: "peer1",
          publicKey: "peer1Public",
          presharedKey: "peer1Psk",
          allowedIps: "10.8.0.2/32",
        },
        {
          name: "peer2",
          publicKey: "peer2Public",
          presharedKey: "peer2Psk",
          allowedIps: "10.8.0.3/32",
        },
      ],
    });

    expect(serverConfig).toContain("[Interface]");
    expect(serverConfig).toContain("Address = 10.8.0.1/24");
    expect(serverConfig).toContain("ListenPort = 51820");
    expect(serverConfig).toContain("PrivateKey = serverPrivate");
    expect(serverConfig).toContain("# peer1");
    expect(serverConfig).toContain("PresharedKey = peer1Psk");
    expect(serverConfig).toContain("AllowedIPs = 10.8.0.3/32");
  });

  it("renders peer config with interface listen port and preshared key", () => {
    const peerConfig = renderPeerConfig({
      addressCidr: "10.8.0.2/32",
      listenPort: 51820,
      privateKey: "peerPrivate",
      dns: "1.1.1.1",
      serverPublicKey: "serverPublic",
      presharedKey: "peerPsk",
      endpoint: "vpn.example.com:51820",
      allowedIps: "0.0.0.0/0",
    });

    expect(peerConfig).toContain("[Interface]");
    expect(peerConfig).toContain("ListenPort = 51820");
    expect(peerConfig).toContain("DNS = 1.1.1.1");
    expect(peerConfig).toContain("[Peer]");
    expect(peerConfig).toContain("PresharedKey = peerPsk");
    expect(peerConfig).toContain("Endpoint = vpn.example.com:51820");
    expect(peerConfig).toContain("AllowedIPs = 0.0.0.0/0");
  });
});
