import {
	type ProviderData,
	providerDataSchema,
	type WidgetPreview,
} from "@grabbin/api";
import { resolveLinkProvider } from "@grabbin/page-link";
import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Label } from "@grabbin/ui/components/label";
import Loading from "@grabbin/ui/components/loading";
import { type ChangeEvent, useState } from "react";
import * as v from "valibot";
import { normalizeHttpsUrl } from "@/lib/normalize-https-url";

type SpotifyResourceType = Exclude<
	NonNullable<ProviderData["spotify"]>["type"],
	undefined
>;

function isSpotifyResourceType(value: string): value is SpotifyResourceType {
	return v.safeParse(providerDataSchema, { spotify: { type: value } }).success;
}

function getSpotifyResourceType(
	value: string,
): SpotifyResourceType | undefined {
	try {
		const normalizedUrl = normalizeHttpsUrl(value);
		if (!normalizedUrl) return undefined;
		const url = new URL(normalizedUrl);
		if (url.protocol !== "https:" || resolveLinkProvider(url).id !== "spotify")
			return undefined;
		return url.pathname.split("/").find(isSpotifyResourceType);
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
	onSpotifyAdd: (preview: WidgetPreview<"spotify">) => Promise<boolean>;
	onInputChange?: (value: string) => void;
	spotifyPreview?: WidgetPreview<"spotify">;
	spotifyPreviewError?: boolean;
}) {
	const [url, setUrl] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string>();
	const normalizedUrl = normalizeHttpsUrl(url);
	const hasInvalidUrl = Boolean(url.trim() && !getSpotifyResourceType(url));
	const preview =
		normalizedUrl && spotifyPreview?.url === normalizedUrl
			? spotifyPreview
			: undefined;
	const invalidUrlMessage =
		"Enter a Spotify artist, album, track, playlist, or episode URL.";
	const errorMessages = [
		{ id: "add", message: error },
		{ id: "url", message: hasInvalidUrl ? invalidUrlMessage : undefined },
		{
			id: "preview",
			message:
				spotifyPreviewError && normalizedUrl && !preview && !hasInvalidUrl
					? "Could not load Spotify data. Check the URL and try again."
					: undefined,
		},
	].filter(({ message }) => message);

	function handleUrlChange(event: ChangeEvent<HTMLInputElement>) {
		setUrl(event.target.value);
		onInputChange?.(event.target.value);
		setError(undefined);
	}

	async function handleAdd() {
		if (!getSpotifyResourceType(url)) {
			setError(invalidUrlMessage);
			return;
		}

		setIsAdding(true);
		try {
			if (!normalizedUrl || !preview || !(await onSpotifyAdd(preview))) {
				setError("Could not add this Spotify link. Try again.");
			}
		} catch {
			setError("Could not add this Spotify link. Try again.");
		} finally {
			setIsAdding(false);
		}
	}

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
						onChange={handleUrlChange}
					/>
				</InputGroup>
				<p className="text-muted-foreground text-xs">
					Spotify data can change, so some details may be unavailable or
					inaccurate.
				</p>
			</div>
			{errorMessages.map(({ id, message }) => (
				<p key={id} role="alert" className="text-destructive text-sm">
					{message}
				</p>
			))}
			<div className="mt-auto flex shrink-0 justify-end">
				<Button
					type="button"
					variant="outline"
					size="xl"
					aria-busy={isAdding}
					aria-label={isAdding ? "Adding Spotify link" : undefined}
					disabled={!preview || isAdding}
					className="relative px-5 text-base"
					onClick={handleAdd}
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
