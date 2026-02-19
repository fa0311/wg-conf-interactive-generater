import { describe, expect, it } from "vitest";
import { promptInputSchema } from "../src/schemas";

describe("promptInputSchema", () => {
  it("parses valid prompt input", () => {
    const result = promptInputSchema.safeParse({
      outputDir: "./generated",
      serverAddressCidr: "10.8.0.1/24",
      serverListenPort: "51820",
      desiredPeerCount: "2",
      publicEndpoint: "vpn.example.com:51820",
      dns: "1.1.1.1",
      allowedIps: "0.0.0.0/0",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    expect(result.data.serverListenPort).toBe(51820);
    expect(result.data.desiredPeerCount).toBe(2);
  });

  it("rejects desired peer count > 253", () => {
    const result = promptInputSchema.safeParse({
      outputDir: "./generated",
      serverAddressCidr: "10.8.0.1/24",
      serverListenPort: "51820",
      desiredPeerCount: "254",
      publicEndpoint: "vpn.example.com:51820",
      dns: "1.1.1.1",
      allowedIps: "0.0.0.0/0",
    });

    expect(result.success).toBe(false);
  });

  it("rejects endpoint without port", () => {
    const result = promptInputSchema.safeParse({
      outputDir: "./generated",
      serverAddressCidr: "10.8.0.1/24",
      serverListenPort: "51820",
      desiredPeerCount: "2",
      publicEndpoint: "vpn.example.com",
      dns: "1.1.1.1",
      allowedIps: "0.0.0.0/0",
    });

    expect(result.success).toBe(false);
  });
});
