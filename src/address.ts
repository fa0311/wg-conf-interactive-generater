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
	let cursor = ipInt;
	const disallowedIpInt = [] as number[];

	return {
		value: value,
		getIp: () => {
			while (disallowedIpInt.includes(cursor)) {
				cursor++;
			}
			if (cursor <= netWorkAddressInt || cursor >= broadcastAddressInt) {
				throw new Error("No more IP addresses available in this CIDR block.");
			}

			const octet1 = (cursor >> 24) & 0xff;
			const octet2 = (cursor >> 16) & 0xff;
			const octet3 = (cursor >> 8) & 0xff;
			const octet4 = cursor & 0xff;

			cursor++;

			return `${octet1}.${octet2}.${octet3}.${octet4}`;
		},
		addDisallowIp: (ip: string) => {
			const [o1, o2, o3, o4] = OctetSchema.parse(ip.split("."));
			const ipInt = (o1 << 24) | (o2 << 16) | (o3 << 8) | o4;
			if (ipInt < netWorkAddressInt || ipInt > broadcastAddressInt) {
				throw new Error("IP address is out of range for this CIDR block.");
			}
			disallowedIpInt.push(ipInt);
		},
		removeDisallowIp: (ip: string) => {
			const [o1, o2, o3, o4] = OctetSchema.parse(ip.split("."));
			const ipInt = (o1 << 24) | (o2 << 16) | (o3 << 8) | o4;
			const index = disallowedIpInt.indexOf(ipInt);
			if (index === -1) {
				throw new Error("IP address is not in the disallow list.");
			}
			disallowedIpInt.splice(index, 1);
		},
	};
};
