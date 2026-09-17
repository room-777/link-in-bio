/// <reference types="@cloudflare/workers-types" />
/// <reference path="../env.d.ts" />
// For Cloudflare Workers, env is accessed via cloudflare:workers module
// Types are defined in env.d.ts based on your alchemy.run.ts bindings

import { env as cloudflareEnv } from "cloudflare:workers";
import type { ServerEnv } from "@my-better-t-app/infra/alchemy.run";

export const env = cloudflareEnv as ServerEnv;
