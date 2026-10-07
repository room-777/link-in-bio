import * as v from "valibot";
import { PageDomainError } from "../exceptions/page-domain.exception";

const hostnameSchema = v.object({
	id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
	hostname: v.string(),
	status: v.string(),
	ssl: v.object({ status: v.string() }),
});
export type CloudflareHostname = v.InferOutput<typeof hostnameSchema>;
export interface CloudflareSaas {
	find(hostname: string): Promise<CloudflareHostname | null>;
	ensure(hostname: string): Promise<CloudflareHostname>;
	get(id: string, hostname: string): Promise<CloudflareHostname>;
	remove(id: string): Promise<void>;
}

/** Uses only Cloudflare's fixed API origin; never exposes provider response bodies or tokens. */
export function createCloudflareSaas({
	zoneId,
	token,
	fetcher = fetch,
}: {
	zoneId: string;
	token: string;
	fetcher?: typeof fetch;
}): CloudflareSaas {
	const endpoint = `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/custom_hostnames`;
	async function request(path: string, method = "GET", body?: unknown) {
		if (!zoneId || !token) throw new PageDomainError("DOMAIN_NOT_CONFIGURED");
		try {
			const response = await fetcher(`${endpoint}${path}`, {
				method,
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: body === undefined ? undefined : JSON.stringify(body),
				redirect: "manual",
				signal: AbortSignal.timeout(8000),
			});
			// Deletion is idempotent if a previous attempt already removed the hostname.
			if (method === "DELETE" && response.status === 404) return null;
			if (!response.ok) throw new Error("Cloudflare request failed.");
			const envelope = v.parse(
				v.object({ success: v.literal(true), result: v.unknown() }),
				await response.json(),
			);
			return envelope.result;
		} catch {
			throw new PageDomainError("DOMAIN_PROVIDER_UNAVAILABLE");
		}
	}
	function validate(value: unknown, hostname: string, id?: string) {
		const parsed = v.safeParse(hostnameSchema, value);
		if (
			!parsed.success ||
			parsed.output.hostname.toLowerCase() !== hostname ||
			(id && parsed.output.id !== id)
		)
			throw new PageDomainError("DOMAIN_PROVIDER_UNAVAILABLE");
		return parsed.output;
	}
	return {
		async find(hostname) {
			const found = v.safeParse(
				v.array(hostnameSchema),
				await request(`?hostname=${encodeURIComponent(hostname)}`),
			);
			if (!found.success || found.output.length > 1)
				throw new PageDomainError("DOMAIN_PROVIDER_UNAVAILABLE");
			return found.output[0] ? validate(found.output[0], hostname) : null;
		},
		async ensure(hostname) {
			// Recover an ID if Cloudflare created the hostname but the DB transaction failed.
			const found = v.safeParse(
				v.array(hostnameSchema),
				await request(`?hostname=${encodeURIComponent(hostname)}`),
			);
			if (!found.success || found.output.length > 1)
				throw new PageDomainError("DOMAIN_PROVIDER_UNAVAILABLE");
			if (found.output[0]) return validate(found.output[0], hostname);
			return validate(
				await request("", "POST", {
					hostname,
					ssl: {
						method: "http",
						type: "dv",
						settings: { min_tls_version: "1.2" },
					},
				}),
				hostname,
			);
		},
		async get(id, hostname) {
			return validate(
				await request(`/${encodeURIComponent(id)}`),
				hostname,
				id,
			);
		},
		async remove(id) {
			await request(`/${encodeURIComponent(id)}`, "DELETE");
		},
	};
}

export interface DomainDns {
	records(hostname: string, type: "CNAME" | "TXT"): Promise<string[]>;
}

/** Checks DNS through a fixed resolver instead of fetching any user-supplied URL. */
export function createDomainDns(fetcher: typeof fetch = fetch): DomainDns {
	return {
		async records(hostname, type) {
			try {
				const url = new URL("https://cloudflare-dns.com/dns-query");
				url.search = new URLSearchParams({ name: hostname, type }).toString();
				const response = await fetcher(url, {
					headers: { Accept: "application/dns-json" },
					redirect: "manual",
					signal: AbortSignal.timeout(5000),
				});
				if (!response.ok) throw new Error("DNS lookup failed.");
				const data = v.parse(
					v.object({
						Status: v.number(),
						Answer: v.optional(
							v.array(
								v.object({
									name: v.string(),
									type: v.number(),
									data: v.string(),
								}),
							),
							[],
						),
					}),
					await response.json(),
				);
				if (data.Status === 3) return [];
				if (data.Status !== 0) throw new Error("DNS lookup failed.");
				return data.Answer.filter(
					(record) =>
						record.type === (type === "CNAME" ? 5 : 16) &&
						record.name.toLowerCase().replace(/\.$/, "") === hostname,
				).map((record) => {
					if (type === "CNAME")
						return record.data.toLowerCase().replace(/\.$/, "");
					// A TXT value can be split across several quoted DNS strings.
					const parts = record.data.match(/"(?:[^"\\]|\\.)*"/g);
					return parts
						? parts.map((part) => JSON.parse(part) as string).join("")
						: record.data;
				});
			} catch {
				throw new PageDomainError("DOMAIN_PROVIDER_UNAVAILABLE");
			}
		},
	};
}
