import type { PageItemLinkMetadata } from "@grabbin/api";
import type { Details } from "spotify-url-info";
import * as spotifyUrlInfoModule from "spotify-url-info";
import { asString, getHttpsUrl, PROVIDER_FETCH_TIMEOUT_MS } from "./runtime";
import type { LinkProviderContext, LinkProviderTarget } from "./types";

type SpotifyUrlInfoFactory = (fetch: typeof globalThis.fetch) => {
	getDetails: (url: string, options?: RequestInit) => Promise<Details>;
};

export async function enrichSpotify(
	url: URL,
	_target: LinkProviderTarget,
	context: LinkProviderContext,
): Promise<Partial<PageItemLinkMetadata>> {
	const { default: spotifyUrlInfo } = spotifyUrlInfoModule as unknown as {
		default: SpotifyUrlInfoFactory;
	};
	const { getDetails } = spotifyUrlInfo(context.fetch);
	const details = await getDetails(url.toString(), {
		signal: AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
	});
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
				tracks: details.tracks.slice(0, 100).map((track) => ({
					...track,
					previewUrl: getHttpsUrl(track.previewUrl),
				})),
			},
		},
	};
}
