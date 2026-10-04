import * as v from "valibot";

export const connectPageDomainSchema = v.object({
	hostname: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(253)),
});
export const pageDomainResponseSchema = v.object({
	domain: v.nullable(
		v.object({
			id: v.string(),
			hostname: v.string(),
			status: v.picklist([
				"waiting_dns",
				"provisioning",
				"active",
				"deleting",
				"expired",
			]),
			canConfigure: v.boolean(),
			graceEndsAt: v.nullable(v.string()),
			lastCheckedAt: v.nullable(v.string()),
			lastError: v.nullable(v.string()),
			records: v.array(
				v.object({
					type: v.picklist(["CNAME", "TXT"]),
					name: v.string(),
					value: v.string(),
				}),
			),
		}),
	),
});
export type PageDomainResponse = v.InferOutput<typeof pageDomainResponseSchema>;
