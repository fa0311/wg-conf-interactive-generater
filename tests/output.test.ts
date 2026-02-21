import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createArtifactPaths } from "../src/artifacts";

const fsMocks = vi.hoisted(() => ({
	mkdir: vi.fn(),
	writeFile: vi.fn(),
	readFile: vi.fn(),
}));

const qrMocks = vi.hoisted(() => ({
	toBuffer: vi.fn(),
}));

vi.mock("node:fs", () => ({
	default: {
		promises: fsMocks,
	},
}));

vi.mock("qrcode", () => ({
	toBuffer: qrMocks.toBuffer,
}));

const sampleState = {
	serverAddressCidr: "10.8.0.1/24",
	serverListenPort: 51820,
	publicEndpoint: "vpn.example.com:51820",
	dns: "1.1.1.1",
	allowedIps: "0.0.0.0/0",
	privateKey: "server-private-key",
	peer: [
		{
			address: "10.8.0.2",
			name: "peer1",
			publicKey: "peer1-public-key",
			presharedKey: "peer1-psk",
		},
	],
};

describe("artifact outputs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("resets output directories with expected paths", async () => {
		const baseDir = "/tmp/wg-conf";
		const artifacts = createArtifactPaths(baseDir);

		await artifacts.resetOutputDirs();

		const peersDir = path.join(baseDir, "peers");

		expect(fsMocks.mkdir).toHaveBeenCalledTimes(2);
		expect(fsMocks.mkdir).toHaveBeenCalledWith(baseDir, { recursive: true, mode: 0o700 });
		expect(fsMocks.mkdir).toHaveBeenCalledWith(peersDir, { recursive: true, mode: 0o700 });
	});

	it("writes configs and state to expected paths", async () => {
		const baseDir = "/tmp/wg-conf";
		const artifacts = createArtifactPaths(baseDir);
		const qrBuffer = Buffer.from("qr-data");

		qrMocks.toBuffer.mockResolvedValue(qrBuffer);

		await artifacts.writeServerConfig("server-config");
		await artifacts.writePeerConfig("peer1", "peer-config");
		await artifacts.writePeerQr("peer1", "peer-config");
		await artifacts.writeState(sampleState);

		expect(fsMocks.writeFile).toHaveBeenCalledWith(path.join(baseDir, "wg0.conf"), "server-config", {
			encoding: "utf8",
			mode: 0o600,
		});
		expect(fsMocks.writeFile).toHaveBeenCalledWith(
			path.join(baseDir, "peers", "peer1.conf"),
			"peer-config",
			{
				encoding: "utf8",
				mode: 0o600,
			},
		);
		expect(qrMocks.toBuffer).toHaveBeenCalledWith("peer-config", {
			type: "png",
			errorCorrectionLevel: "M",
		});
		expect(fsMocks.writeFile).toHaveBeenCalledWith(
			path.join(baseDir, "peers", "peer1.png"),
			qrBuffer,
			{
				mode: 0o600,
			},
		);
		expect(fsMocks.writeFile).toHaveBeenCalledWith(
			path.join(baseDir, "server.json"),
			JSON.stringify(sampleState, null, 2),
			{
				encoding: "utf8",
				mode: 0o600,
			},
		);
	});

	it("reads state from expected path", async () => {
		const baseDir = "/tmp/wg-conf";
		const artifacts = createArtifactPaths(baseDir);
		const statePath = path.join(baseDir, "server.json");

		fsMocks.readFile.mockImplementation(async (filePath: string) => {
			if (filePath === statePath) {
				return JSON.stringify(sampleState);
			}
			throw new Error(`unexpected read: ${filePath}`);
		});

		const parsedState = await artifacts.readState();

		expect(parsedState).toEqual(sampleState);
		expect(fsMocks.readFile).toHaveBeenCalledWith(statePath, {
			encoding: "utf8",
		});
	});
});
