import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createArtifactPaths } from "../src/artifacts";

const fsMocks = vi.hoisted(() => ({
	rm: vi.fn(),
	mkdir: vi.fn(),
	writeFile: vi.fn(),
	readFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
	default: {
		promises: fsMocks,
	},
}));

const sampleState = {
	serverAddressCidr: "10.8.0.1/24",
	serverListenPort: 51820,
	desiredPeerCount: 2,
	publicEndpoint: "vpn.example.com:51820",
	dns: "1.1.1.1",
	allowedIps: "0.0.0.0/0",
};

describe("artifact outputs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("resets output directories with expected paths", async () => {
		const baseDir = "/tmp/wg-conf";
		const artifacts = createArtifactPaths(baseDir);

		await artifacts.resetOutputDirs();

		const configDir = path.join(baseDir, "config");
		const stateDir = path.join(configDir, "state");
		const peersDir = path.join(configDir, "peers");

		expect(fsMocks.rm).toHaveBeenCalledTimes(1);
		expect(fsMocks.rm).toHaveBeenCalledWith(configDir, { recursive: true, force: true });
		expect(fsMocks.mkdir).toHaveBeenCalledTimes(3);
		expect(fsMocks.mkdir).toHaveBeenCalledWith(configDir, { recursive: true, mode: 0o700 });
		expect(fsMocks.mkdir).toHaveBeenCalledWith(stateDir, { recursive: true, mode: 0o700 });
		expect(fsMocks.mkdir).toHaveBeenCalledWith(peersDir, { recursive: true, mode: 0o700 });
	});

	it("writes configs and state to expected paths", async () => {
		const baseDir = "/tmp/wg-conf";
		const artifacts = createArtifactPaths(baseDir);

		await artifacts.writeServerConfig("server-config");
		await artifacts.writePeerConfig("peer1", "peer-config");
		await artifacts.writeRootKey("root-key");
		await artifacts.writeState(sampleState);

		const configDir = path.join(baseDir, "config");
		const stateDir = path.join(configDir, "state");

		expect(fsMocks.writeFile).toHaveBeenCalledWith(path.join(configDir, "wg0.conf"), "server-config", {
			encoding: "utf8",
			mode: 0o600,
		});
		expect(fsMocks.writeFile).toHaveBeenCalledWith(
			path.join(configDir, "peers", "peer1.conf"),
			"peer-config",
			{
				encoding: "utf8",
				mode: 0o600,
			},
		);
		expect(fsMocks.writeFile).toHaveBeenCalledWith(path.join(stateDir, "root.key"), "root-key", {
			encoding: "utf8",
			mode: 0o600,
		});
		expect(fsMocks.writeFile).toHaveBeenCalledWith(
			path.join(stateDir, "server.json"),
			JSON.stringify(sampleState, null, 2),
			{
				encoding: "utf8",
				mode: 0o600,
			},
		);
	});

	it("reads state and root key from expected paths", async () => {
		const baseDir = "/tmp/wg-conf";
		const artifacts = createArtifactPaths(baseDir);
		const configDir = path.join(baseDir, "config");
		const stateDir = path.join(configDir, "state");

		fsMocks.readFile.mockImplementation(async (filePath: string) => {
			if (filePath === path.join(stateDir, "server.json")) {
				return JSON.stringify(sampleState);
			}
			if (filePath === path.join(stateDir, "root.key")) {
				return "root-key";
			}
			throw new Error(`unexpected read: ${filePath}`);
		});

		const parsedState = await artifacts.readState();
		const parsedRootKey = await artifacts.readRootKey();

		expect(parsedState).toEqual(sampleState);
		expect(parsedRootKey).toBe("root-key");
		expect(fsMocks.readFile).toHaveBeenCalledWith(path.join(stateDir, "server.json"), {
			encoding: "utf8",
		});
		expect(fsMocks.readFile).toHaveBeenCalledWith(path.join(stateDir, "root.key"), {
			encoding: "utf8",
		});
	});
});
