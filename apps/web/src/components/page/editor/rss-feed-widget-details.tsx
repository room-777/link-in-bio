import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import Loading from "@grabbin/ui/components/loading";
import { useState } from "react";

export default function RssFeedWidgetDetails({
	onRssFeedAdd,
}: {
	onRssFeedAdd: (url: string) => Promise<boolean>;
}) {
	const [url, setUrl] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string>();
	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<InputGroup className="h-10">
				<InputGroupInput
					aria-label="RSS Feed URL"
					aria-invalid={Boolean(error)}
					autoComplete="url"
					inputMode="url"
					placeholder="Enter a supported URL"
					type="url"
					value={url}
					onChange={(event) => {
						setUrl(event.target.value);
						setError(undefined);
					}}
				/>
			</InputGroup>
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
