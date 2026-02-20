import { describe, expect, it } from "vitest";
import { cidrParser, endpointParser } from "../src/address";

describe("address parsers", () => {
	it("parses endpoint host and port with current behavior", () => {
		expect(endpointParser("example.com:51820")).toEqual({
			host: "example.com",
			port: 51820,
		});
		expect(endpointParser("127.0.0.1:1")).toEqual({
			host: "127.0.0.1",
			port: 1,
		});
		expect(endpointParser("host:65535")).toEqual({ host: "host", port: 65535 });
		expect(endpointParser(":51820")).toEqual({ host: "", port: 51820 });

		const missingPort = endpointParser("host:");
		expect(missingPort.host).toBe("host");
		expect(missingPort.port).toBeNaN();
	});

	it("allocates sequential IPs from CIDR", () => {
		const cidr = cidrParser("10.8.0.1/30");

		expect(cidr.getIp()).toBe("10.8.0.1");
		expect(cidr.getIp()).toBe("10.8.0.2");
	});

	it("respects the starting IP", () => {
		const cidr = cidrParser("10.8.0.5/24");

		expect(cidr.getIp()).toBe("10.8.0.5");
		expect(cidr.getIp()).toBe("10.8.0.6");
	});

	it("throws when CIDR allocation is exhausted", () => {
		const cidr = cidrParser("10.8.0.1/30");

		cidr.getIp();
		cidr.getIp();
		expect(() => cidr.getIp()).toThrow("No more IP addresses available in this CIDR block.");
	});
});
