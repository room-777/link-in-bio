"use client";

import { Button } from "@grabbin/ui/components/button";
import {
	InputGroup,
	InputGroupInput,
} from "@grabbin/ui/components/input-group";
import { Label } from "@grabbin/ui/components/label";
import Loading from "@grabbin/ui/components/loading";
import { type ChangeEvent, useState } from "react";
import { getTweetId } from "../../utils/tweet-url";

export default function TweetWidgetDetails({
	onTweetAdd,
	onInputChange,
}: {
	onTweetAdd: (url: string) => Promise<boolean>;
	onInputChange?: (value: string) => void;
}) {
	const [url, setUrl] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string>();

	function handleUrlChange(event: ChangeEvent<HTMLInputElement>) {
		setUrl(event.target.value);
		onInputChange?.(event.target.value);
		setError(undefined);
	}

	async function handleAddTweet() {
		if (!getTweetId(url)) {
			setError("Enter a valid X post URL or ID.");
			return;
		}

		setIsAdding(true);
		try {
			if (!(await onTweetAdd(url.trim()))) {
				setError("Could not add this post. Check the URL or ID and try again.");
			}
		} catch {
			setError("Could not add this post. Check the URL or ID and try again.");
		} finally {
			setIsAdding(false);
		}
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<div className="flex flex-col gap-2">
				<Label htmlFor="tweet-url">Tweet ID or URL</Label>
				<InputGroup className="h-12">
					<InputGroupInput
						id="tweet-url"
						aria-invalid={Boolean(error)}
						placeholder="Paste an X post URL or enter its ID"
						type="text"
						value={url}
						onChange={handleUrlChange}
					/>
				</InputGroup>
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
					aria-label={isAdding ? "Adding X post" : undefined}
					disabled={!url.trim() || isAdding}
					className="relative px-5 text-base"
					onClick={handleAddTweet}
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
