import type { PageItemLinkMetadata, ProviderData } from "@grabbin/api";
import type { Details } from "spotify-url-info";
import * as spotifyUrlInfoModule from "spotify-url-info";
import {
	asRecord,
	asString,
	getDefaultUserAgent,
	getHttpsUrl,
	PROVIDER_FETCH_TIMEOUT_MS,
} from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

type SpotifyUrlInfoFactory = (fetch: typeof globalThis.fetch) => {
	getDetails: (url: string, options?: RequestInit) => Promise<Details>;
	getData: (url: string, options?: RequestInit) => Promise<unknown>;
};

type SpotifyData = NonNullable<ProviderData["spotify"]>;
type SpotifyColor = NonNullable<
	NonNullable<SpotifyData["visualIdentity"]>["backgroundBase"]
>;
type SpotifyVisualIdentity = NonNullable<SpotifyData["visualIdentity"]>;

function getSpotifyColor(value: unknown): SpotifyColor | undefined {
	const color = asRecord(value);
	if (!color) return undefined;
	const { alpha, red, green, blue } = color;
	if (
		typeof alpha !== "number" ||
		!Number.isInteger(alpha) ||
		alpha < 0 ||
		alpha > 255 ||
		typeof red !== "number" ||
		!Number.isInteger(red) ||
		red < 0 ||
		red > 255 ||
		typeof green !== "number" ||
		!Number.isInteger(green) ||
		green < 0 ||
		green > 255 ||
		typeof blue !== "number" ||
		!Number.isInteger(blue) ||
		blue < 0 ||
		blue > 255
	)
		return undefined;
	return { alpha, red, green, blue };
}

function getSpotifyVisualIdentity(
	data: unknown,
): SpotifyVisualIdentity | undefined {
	const visualIdentity = asRecord(asRecord(data)?.visualIdentity);
	if (!visualIdentity) return undefined;
	const colors = {
		backgroundBase: getSpotifyColor(visualIdentity.backgroundBase),
		backgroundTintedBase: getSpotifyColor(visualIdentity.backgroundTintedBase),
		textBase: getSpotifyColor(visualIdentity.textBase),
		textBrightAccent: getSpotifyColor(visualIdentity.textBrightAccent),
		textSubdued: getSpotifyColor(visualIdentity.textSubdued),
	};
	const definedColors = Object.fromEntries(
		Object.entries(colors).filter(([, color]) => color),
	) as SpotifyVisualIdentity;
	return Object.keys(definedColors).length ? definedColors : undefined;
}

function getSpotifyPrimaryColor(data: unknown) {
	const attributes = asRecord(data)?.attributes;
	if (!Array.isArray(attributes)) return undefined;
	const value = attributes
		.map(asRecord)
		.find((attribute) => attribute?.key === "primary_color")?.value;
	const color = asString(value);
	return color && /^#[\da-f]{6}$/i.test(color) ? color : undefined;
}

export async function enrichSpotify(
	url: URL,
	_target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const { default: spotifyUrlInfo } = spotifyUrlInfoModule as unknown as {
		default: SpotifyUrlInfoFactory;
	};
	const { getDetails, getData } = spotifyUrlInfo(context.fetch);
	const options = {
		signal: AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
		headers: { "User-Agent": getDefaultUserAgent(url) },
	};
	const [details, rawData] = await Promise.all([
		getDetails(url.toString(), options),
		getData(url.toString(), options).catch(() => undefined),
	]);
	const preview = details.preview;
	return {
		title: asString(preview.title),
		description:
			asString(preview.description) ??
			(preview.type === "track" ? asString(preview.artist) : undefined),
		imageUrl: getHttpsUrl(preview.image),
		providerData: {
			spotify: {
				type: preview.type,
				date: preview.date ?? undefined,
				track: preview.track,
				artist: preview.artist,
				audio: getHttpsUrl(preview.audio),
				link: getHttpsUrl(preview.link),
				embed: getHttpsUrl(preview.embed),
				tracks: details.tracks.slice(0, 15).map((track) => ({
					...track,
					previewUrl: getHttpsUrl(track.previewUrl),
				})),
				primaryColor: getSpotifyPrimaryColor(rawData),
				visualIdentity: getSpotifyVisualIdentity(rawData),
			},
		},
	};
}
