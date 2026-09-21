import { AwsClient } from "aws4fetch";

const imageExtensions = {
	"image/avif": "avif",
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
} as const;

export function createPageImageKey(input: {
	userId: string;
	pageId: string;
	contentType: keyof typeof imageExtensions;
}) {
	return `users/${input.userId}/pages/${input.pageId}/profile/${crypto.randomUUID()}.${imageExtensions[input.contentType]}`;
}

export function isOwnedPageMediaKey(input: {
	key: string;
	userId: string;
	pageId: string;
	scope: "profile" | "items";
}) {
	const prefix = `users/${input.userId}/pages/${input.pageId}/${input.scope}/`;
	return (
		input.key === input.key.trim() &&
		!input.key.includes("..") &&
		input.key.startsWith(prefix) &&
		input.key.length > prefix.length
	);
}

export function getPublicPageItemMediaUrl(
	publicBaseUrl: string | undefined,
	objectKey: string,
) {
	const base = publicBaseUrl?.trim().replace(/\/+$/, "");
	if (!base) return undefined;

	try {
		if (new URL(base).protocol !== "https:") return undefined;
	} catch {
		return undefined;
	}

	return `${base}/${objectKey
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

export async function createPresignedPutUrl(input: {
	accountId: string;
	bucketName: string;
	accessKeyId: string;
	secretAccessKey: string;
	key: string;
	contentType: string;
	expiresInSeconds?: number;
}) {
	const expiresInSeconds = input.expiresInSeconds ?? 900;
	const endpoint = new URL(
		`https://${input.accountId}.r2.cloudflarestorage.com/${input.bucketName}/${input.key}`,
	);
	endpoint.searchParams.set("X-Amz-Expires", String(expiresInSeconds));

	const request = await new AwsClient({
		accessKeyId: input.accessKeyId,
		secretAccessKey: input.secretAccessKey,
		service: "s3",
		region: "auto",
	}).sign(
		new Request(endpoint, {
			method: "PUT",
			headers: { "Content-Type": input.contentType },
		}),
		{ aws: { signQuery: true } },
	);

	return {
		url: request.url,
		expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
	};
}
