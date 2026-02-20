import { describe, expect, it } from "vitest";
import { renderPeerConfig, renderServerConfig } from "../src/render";

describe("render", () => {
  it("renders server config with peer blocks and preshared keys", () => {
    const serverConfig = renderServerConfig({
      address: "10.8.0.1/24",
      listenPort: 51820,
      privateKey: "serverPrivate",
    });
    serverConfig.add({
      name: "peer1",
      publicKey: "peer1Public",
      presharedKey: "peer1Psk",
      allowedIps: "10.8.0.2/32",
    });
    serverConfig.add({
      name: "peer2",
      publicKey: "peer2Public",
      presharedKey: "peer2Psk",
      allowedIps: "10.8.0.3/32",
    });
    const rendered = serverConfig.render();

    expect(rendered).toContain("[Interface]");
    expect(rendered).toContain("Address = 10.8.0.1/24");
    expect(rendered).toContain("ListenPort = 51820");
    expect(rendered).toContain("PrivateKey = serverPrivate");
    expect(rendered).toContain("# peer1");
    expect(rendered).toContain("PresharedKey = peer1Psk");
    expect(rendered).toContain("AllowedIPs = 10.8.0.3/32");
  });

  it("renders peer config with interface listen port and preshared key", () => {
    const peerConfig = renderPeerConfig({
      address: "10.8.0.2/32",
      listenPort: 51820,
      privateKey: "peerPrivate",
      publicKey: "serverPublic",
      presharedKey: "peerPsk",
      allowedIps: "0.0.0.0/0",
    });
    const rendered = peerConfig.render();

    expect(rendered).toContain("[Interface]");
    expect(rendered).toContain("Address = 10.8.0.2/32");
    expect(rendered).toContain("ListenPort = 51820");
    expect(rendered).toContain("PrivateKey = peerPrivate");
    expect(rendered).toContain("[Peer]");
    expect(rendered).toContain("PublicKey = serverPublic");
    expect(rendered).toContain("PresharedKey = peerPsk");
    expect(rendered).toContain("AllowedIPs = 0.0.0.0/0");
  });
});
