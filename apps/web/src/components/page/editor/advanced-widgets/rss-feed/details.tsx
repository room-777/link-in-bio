import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Label } from "@grabbin/ui/components/label";
import Loading from "@grabbin/ui/components/loading";
import { useState } from "react";
import type { AdvancedWidgetModule } from "@/constant/widget/advanced-widget-registry";
import { AdvancedWidgetBadges } from "../../advanced-widget-visuals";

export default function RssFeedWidgetDetails({
	onRssFeedAdd,
	badges,
}: {
	onRssFeedAdd: (url: string) => Promise<boolean>;
	badges: AdvancedWidgetModule["badges"];
}) {
	const [url, setUrl] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string>();
	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<div className="flex flex-col gap-2">
				<Label htmlFor="rss-feed-url">RSS feed URL</Label>
				<InputGroup className="h-12">
					<InputGroupInput
						id="rss-feed-url"
						aria-invalid={Boolean(error)}
						autoComplete="url"
						inputMode="url"
						placeholder="Paste a supported URL"
						type="url"
						value={url}
						onChange={(event) => {
							setUrl(event.target.value);
							setError(undefined);
						}}
					/>
				</InputGroup>
				<div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
					<span>Supported platforms:</span>
					<AdvancedWidgetBadges badges={badges} sizeClassName="size-5.5" />
				</div>
			</div>
			{error ? (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			) : null}
			<div className="mt-auto flex shrink-0 justify-end">
				<Button
					type="button"
					variant="outline"
					size="xl"
					aria-busy={isAdding}
					aria-label={isAdding ? "Adding RSS feed" : undefined}
					disabled={!url.trim() || isAdding}
					className="relative px-5 text-base"
					onClick={async () => {
						setIsAdding(true);
						try {
							if (!(await onRssFeedAdd(url))) {
								setError("Enter a supported RSS feed URL.");
							}
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
