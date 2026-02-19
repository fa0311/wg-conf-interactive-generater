import z from "zod";

interface Endpoint {
	host: string;
	port: number;
}

export const endpointParser = (value: string): Endpoint => {
	const separatorIndex = value.lastIndexOf(":");
	const host = value.slice(0, separatorIndex);
	const port = Number.parseInt(value.slice(separatorIndex + 1), 10);

	return { host, port };
};

const CidrSchema = z.tuple([z.ipv4(), z.coerce.number().min(0).max(32)]);
const OctetSchema = z.tuple([z.coerce.number(), z.coerce.number(), z.coerce.number(), z.coerce.number()]);

export const cidrParser = (value: string) => {
	const [ip, prefix] = CidrSchema.parse(value.split("/"));
	const [octet1, octet2, octet3, octet4] = OctetSchema.parse(ip.split("."));
	const ipInt = (octet1 << 24) | (octet2 << 16) | (octet3 << 8) | octet4;
	const netWorkAddressInt = ipInt & (0xffffffff << (32 - prefix));
	const broadcastAddressInt = netWorkAddressInt | (0xffffffff >>> prefix);
	return { prefix, ipInt, netWorkAddressInt, broadcastAddressInt };
};

export const cidrConverter = (value: ReturnType<typeof cidrParser>) => {
	let ipInt = value.ipInt;
	const { broadcastAddressInt } = value;

	return {
		getIp: () => {
			ipInt++;
			if (ipInt >= broadcastAddressInt) {
				throw new Error("No more IP addresses available in this CIDR block.");
			}
			const octet1 = (ipInt >> 24) & 0xff;
			const octet2 = (ipInt >> 16) & 0xff;
			const octet3 = (ipInt >> 8) & 0xff;
			const octet4 = ipInt & 0xff;
			return `${octet1}.${octet2}.${octet3}.${octet4}`;
		},
	};
};
