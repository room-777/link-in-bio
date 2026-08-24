import { getCloudflareContext } from "@opennextjs/cloudflare";

export const { env } = await getCloudflareContext({ async: true });
