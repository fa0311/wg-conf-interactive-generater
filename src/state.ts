import { z } from "zod";
import type { PersistedState } from "./schemas";

export const persistedStateSchema = z.object({
	serverAddressCidr: z.string(),
	serverListenPort: z.number(),
	desiredPeerCount: z.number(),
	publicEndpoint: z.string(),
	dns: z.string(),
	allowedIps: z.string(),
});

interface PromptDefaults {
	serverAddressCidr: string;
	serverListenPort: string;
	desiredPeerCount: string;
	publicEndpoint: string;
	dns: string;
	allowedIps: string;
}

export const parsePersistedState = (stateText: string): PersistedState | undefined => {
	const stateJson = JSON.parse(stateText) as unknown;
	const parsed = persistedStateSchema.safeParse(stateJson);
	return parsed.success ? parsed.data : undefined;
};

// export const resolvePromptDefaults = (persistedState: PersistedState | undefined): PromptDefaults => ({
// 	serverAddressCidr: persistedState?.serverAddressCidr ?? "10.8.0.1/24",
// 	serverListenPort: `${persistedState?.serverListenPort ?? 51820}`,
// 	desiredPeerCount: `${persistedState?.desiredPeerCount ?? 1}`,
// 	publicEndpoint: persistedState?.publicEndpoint ?? "",
// 	dns: persistedState?.dns ?? "1.1.1.1",
// 	allowedIps: persistedState?.allowedIps ?? "0.0.0.0/0",
// });
