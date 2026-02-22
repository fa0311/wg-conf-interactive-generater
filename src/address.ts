import z from "zod";

interface Endpoint {
	host: string;
	port: number;
}

const CidrSchema = z.tuple([z.ipv4(), z.coerce.number().min(0).max(32)]);
const OctetSchema = z.tuple([z.coerce.number(), z.coerce.number(), z.coerce.number(), z.coerce.number()]);

const toIp = (addressInt: number): string => {
	const octet1 = (addressInt >> 24) & 0xff;
	const octet2 = (addressInt >> 16) & 0xff;
	const octet3 = (addressInt >> 8) & 0xff;
	const octet4 = addressInt & 0xff;
	return `${octet1}.${octet2}.${octet3}.${octet4}`;
};

const toIpInt = (ip: string): number => {
	const [o1, o2, o3, o4] = OctetSchema.parse(ip.split("."));
	return (o1 << 24) | (o2 << 16) | (o3 << 8) | o4;
};

export const endpointParser = (value: string): Endpoint => {
	const separatorIndex = value.lastIndexOf(":");
	const host = value.slice(0, separatorIndex);
	const port = Number.parseInt(value.slice(separatorIndex + 1), 10);
	return { host, port };
};

export type Cidr = ReturnType<typeof cidrParser>;

export const cidrParser = (value: string) => {
	const [ip, prefix] = CidrSchema.parse(value.split("/"));
	const ipInt = toIpInt(ip);
	const netWorkAddressInt = ipInt & (0xffffffff << (32 - prefix));
	const broadcastAddressInt = netWorkAddressInt | (0xffffffff >>> prefix);
	const disallowedIpInt = [ipInt];
	const isIpInRange = (ip: number) => {
		return ip > netWorkAddressInt && ip < broadcastAddressInt;
	};

	return {
		value: value,
		getIp: () => {
			const ipInt = (() => {
				let cursor = netWorkAddressInt + 1;
				while (disallowedIpInt.includes(cursor)) {
					cursor++;
				}
				if (!isIpInRange(cursor)) {
					throw new Error("No more IP addresses available in this CIDR block.");
				}
				return cursor;
			})();
			return toIp(ipInt);
		},
		isInRange: (ip: string) => {
			const ipInt = toIpInt(ip);
			return isIpInRange(ipInt);
		},
		addDisallowIp: (ip: string) => {
			const ipInt = toIpInt(ip);
			if (!isIpInRange(ipInt)) {
				throw new Error("IP address is out of range for this CIDR block.");
			}
			disallowedIpInt.push(ipInt);
		},
		removeDisallowIp: (ip: string) => {
			const ipInt = toIpInt(ip);
			const index = disallowedIpInt.indexOf(ipInt);
			if (index === -1) {
				throw new Error("IP address is not in the disallow list.");
			}
			disallowedIpInt.splice(index, 1);
		},
	};
};
