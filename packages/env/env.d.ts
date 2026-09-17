import type { ServerEnv } from "@grabbin/infra/alchemy.run";

// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/cloudflare/compute/workers

export type CloudflareEnv = ServerEnv;

declare global {
	type Env = CloudflareEnv;

	namespace Cloudflare {
		export interface Env extends CloudflareEnv {}
	}
}
