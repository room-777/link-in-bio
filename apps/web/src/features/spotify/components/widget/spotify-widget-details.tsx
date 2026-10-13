import type { PageItemLinkMetadata } from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";
import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Label } from "@grabbin/ui/components/label";
import Loading from "@grabbin/ui/components/loading";
import { useState } from "react";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

const spotifyTypes = [
	"artist",
	"album",
	"track",
	"playlist",
	"episode",
] as const;
type SpotifyType = (typeof spotifyTypes)[number];

function getSpotifyType(value: string): SpotifyType | undefined {
	try {
		const normalizedUrl = normalizeHttpsUrl(value);
		if (!normalizedUrl) return undefined;
		const url = new URL(normalizedUrl);
		if (url.protocol !== "https:" || resolveLinkProvider(url).id !== "spotify")
			return undefined;
		return url.pathname
			.split("/")
			.find((segment): segment is SpotifyType =>
				spotifyTypes.includes(segment as SpotifyType),
			);
	} catch {
		return undefined;
	}
}

export default function SpotifyWidgetDetails({
	onSpotifyAdd,
	onInputChange,
	spotifyPreview,
	spotifyPreviewError,
}: {
	onSpotifyAdd: (
		url: string,
		metadata: PageItemLinkMetadata,
	) => Promise<boolean>;
	onInputChange?: (value: string) => void;
	spotifyPreview?: { url: string; metadata: PageItemLinkMetadata };
	spotifyPreviewError?: boolean;
}) {
	const [url, setUrl] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string>();
	const normalizedUrl = normalizeHttpsUrl(url);
	const hasInvalidUrl = Boolean(url.trim() && !getSpotifyType(url));
	const previewMetadata =
		normalizedUrl && spotifyPreview?.url === normalizedUrl
			? spotifyPreview.metadata
			: undefined;

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<div className="flex flex-col gap-2">
				<Label htmlFor="spotify-url">Spotify URL</Label>
				<InputGroup className="h-12">
					<InputGroupInput
						id="spotify-url"
						aria-invalid={Boolean(error)}
						autoComplete="url"
						inputMode="url"
						placeholder="Paste an artist, album, track, playlist, or episode URL"
						type="url"
						value={url}
						onChange={(event) => {
							setUrl(event.target.value);
							onInputChange?.(event.target.value);
							setError(undefined);
						}}
					/>
				</InputGroup>
				<p className="text-muted-foreground text-xs">
					Spotify data can change, so some details may be unavailable or
					inaccurate.
				</p>
			</div>
			{error ? (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			) : null}
			{hasInvalidUrl ? (
				<p role="alert" className="text-destructive text-sm">
					Enter a Spotify artist, album, track, playlist, or episode URL.
				</p>
			) : null}
			{spotifyPreviewError &&
			normalizedUrl &&
			!previewMetadata &&
			!hasInvalidUrl ? (
				<p role="alert" className="text-destructive text-sm">
					Could not load Spotify data. Check the URL and try again.
				</p>
			) : null}
			<div className="mt-auto flex shrink-0 justify-end">
				<Button
					type="button"
					variant="outline"
					size="xl"
					aria-busy={isAdding}
					aria-label={isAdding ? "Adding Spotify link" : undefined}
					disabled={!previewMetadata || isAdding}
					className="relative px-5 text-base"
					onClick={async () => {
						if (!getSpotifyType(url)) {
							setError(
								"Enter a Spotify artist, album, track, playlist, or episode URL.",
							);
							return;
						}
						setIsAdding(true);
						try {
							if (
								!normalizedUrl ||
								!previewMetadata ||
								!(await onSpotifyAdd(normalizedUrl, previewMetadata))
							) {
								setError("Could not add this Spotify link. Try again.");
							}
						} catch {
							setError("Could not add this Spotify link. Try again.");
						} finally {
							setIsAdding(false);
						}
					}}
				>
					<span className={isAdding ? "opacity-0" : ""}>Add</span>
					{isAdding ? (
						<Loading aria-hidden="true" className="absolute size-4" />
					) : null}
				</Button>
			</div>
		</div>
	);
}
