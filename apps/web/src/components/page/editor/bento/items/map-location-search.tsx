"use client";

import { Input } from "@grabbin/ui/components/input";
import Loading from "@grabbin/ui/components/loading";
import { RefreshCw, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
	MapboxGeocodingError,
	type MapSearchResult,
	searchMapboxLocations,
} from "@/lib/mapbox-geocoding";

type SearchStatus = "idle" | "loading" | "ready" | "empty" | "error";

function isAbortError(error: unknown) {
	return (
		(error instanceof Error && error.name === "AbortError") ||
		(typeof error === "object" &&
			error !== null &&
			(error as { name?: unknown }).name === "AbortError")
	);
}

function getErrorMessage(error: unknown) {
	if (!(error instanceof MapboxGeocodingError)) {
		return "Couldn’t load locations. Try again.";
	}
	switch (error.code) {
		case "missing-token":
			return "Location search is unavailable. Try again.";
		case "invalid-query":
			return "Enter at least 2 characters.";
		case "invalid-response":
			return "The location results were invalid. Try again.";
		case "http":
		case "network":
			return "Couldn’t load locations. Try again.";
	}
}

function getResultLabel(result: MapSearchResult) {
	return result.address ? `${result.name} · ${result.address}` : result.name;
}

export function MapLocationSearch({
	accessToken,
	language,
	disabled = false,
	onSelect,
}: {
	accessToken?: string;
	language?: string;
	disabled?: boolean;
	onSelect: (result: MapSearchResult) => void;
}) {
	const [inputValue, setInputValue] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [results, setResults] = useState<MapSearchResult[]>([]);
	const [status, setStatus] = useState<SearchStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [retryNonce, setRetryNonce] = useState(0);
	const requestSequenceRef = useRef(0);
	const controllerRef = useRef<AbortController | null>(null);
	const searchId = useId();
	const inputId = `${searchId}-input`;
	const listboxId = `${searchId}-listbox`;
	const query = searchQuery.trim();

	// biome-ignore lint/correctness/useExhaustiveDependencies: retryNonce intentionally retries the current query.
	useEffect(() => {
		const sequence = ++requestSequenceRef.current;
		controllerRef.current?.abort();
		controllerRef.current = null;
		setActiveIndex(-1);

		if (disabled) {
			setResults([]);
			setStatus("idle");
			setErrorMessage(null);
			setIsOpen(false);
			return;
		}

		if (query.length < 2) {
			setResults([]);
			setStatus("idle");
			setErrorMessage(null);
			return;
		}

		setResults([]);
		setStatus("loading");
		setErrorMessage(null);
		setIsOpen(true);
		const controller = new AbortController();
		controllerRef.current = controller;
		const timeout = window.setTimeout(() => {
			void searchMapboxLocations(query, {
				accessToken,
				language,
				signal: controller.signal,
			})
				.then((nextResults) => {
					if (
						controller.signal.aborted ||
						requestSequenceRef.current !== sequence ||
						controllerRef.current !== controller
					)
						return;
					const limitedResults = nextResults.slice(0, 5);
					setResults(limitedResults);
					setStatus(limitedResults.length ? "ready" : "empty");
				})
				.catch((error: unknown) => {
					if (
						isAbortError(error) ||
						controller.signal.aborted ||
						requestSequenceRef.current !== sequence ||
						controllerRef.current !== controller
					)
						return;
					setResults([]);
					setErrorMessage(getErrorMessage(error));
					setStatus("error");
				});
		}, 250);

		return () => {
			window.clearTimeout(timeout);
			controller.abort();
			if (controllerRef.current === controller) controllerRef.current = null;
		};
	}, [accessToken, disabled, language, query, retryNonce]);

	function selectResult(result: MapSearchResult) {
		onSelect(result);
		setInputValue(getResultLabel(result));
		setSearchQuery("");
		setResults([]);
		setStatus("idle");
		setErrorMessage(null);
		setActiveIndex(-1);
		setIsOpen(false);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (disabled || !isOpen) return;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			if (status !== "ready" || results.length === 0) return;
			event.preventDefault();
			setActiveIndex((current) =>
				event.key === "ArrowDown"
					? current < results.length - 1
						? current + 1
						: 0
					: current > 0
						? current - 1
						: results.length - 1,
			);
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			const result = activeIndex >= 0 ? results[activeIndex] : undefined;
			if (status === "ready" && result) selectResult(result);
			return;
		}
		if (event.key === "Escape") {
			event.preventDefault();
			setIsOpen(false);
			setActiveIndex(-1);
		}
	}

	const showPanel = isOpen && (status !== "idle" || query.length > 0);
	const visiblePanel = !disabled && showPanel;
	const hasListbox = visiblePanel && status === "ready";
	const activeOptionId =
		activeIndex >= 0 ? `${searchId}-option-${activeIndex}` : undefined;

	return (
		<div className="relative w-full">
			<div className="relative">
				<Input
					id={inputId}
					role="combobox"
					value={inputValue}
					aria-label="Search location"
					aria-autocomplete="list"
					aria-controls={hasListbox ? listboxId : undefined}
					aria-expanded={visiblePanel}
					aria-haspopup="listbox"
					aria-activedescendant={hasListbox ? activeOptionId : undefined}
					aria-busy={status === "loading"}
					disabled={disabled}
					placeholder="Search locations"
					onChange={(event) => {
						setInputValue(event.target.value);
						setSearchQuery(event.target.value);
						setIsOpen(true);
					}}
					onKeyDown={handleKeyDown}
					onFocus={() => query.length > 0 && setIsOpen(true)}
					className="h-8 rounded-md border-0 bg-white/20 pr-9 text-white placeholder:text-white/60 focus-visible:ring-0"
				/>
				<Search
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white"
				/>
			</div>
			{visiblePanel ? (
				<div className="mt-1.5 overflow-hidden rounded-md bg-black text-white">
					{status === "loading" ? (
						<div className="flex items-center justify-center px-3 py-3">
							<Loading
								aria-label="Searching locations"
								className="size-5 text-white"
							/>
						</div>
					) : status === "ready" ? (
						<div
							id={listboxId}
							role="listbox"
							aria-label="Location results"
							className="max-h-56 overflow-y-auto p-1"
						>
							{results.map((result, index) => (
								<button
									key={result.id}
									id={`${searchId}-option-${index}`}
									type="button"
									role="option"
									aria-selected={activeIndex === index}
									onMouseEnter={() => setActiveIndex(index)}
									onClick={() => selectResult(result)}
									className="block w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none aria-selected:bg-white/20"
								>
									<span className="block truncate">{result.name}</span>
								</button>
							))}
						</div>
					) : status === "empty" ? (
						<div className="px-3 py-3 text-sm text-white/70">
							No locations found.
						</div>
					) : status === "error" ? (
						<div className="flex items-center justify-between gap-2 px-3 py-3 text-sm text-white/70">
							<span>{errorMessage ?? "Couldn’t load locations."}</span>
							<button
								type="button"
								className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
								onClick={() => setRetryNonce((value) => value + 1)}
							>
								<RefreshCw className="size-3.5" aria-hidden="true" />
								Retry
							</button>
						</div>
					) : null}
				</div>
			) : null}
			<div className="sr-only" aria-live="polite" aria-atomic="true">
				{status === "loading"
					? "Searching locations."
					: status === "empty"
						? "No locations found."
						: status === "error"
							? "Location search failed. Try again."
							: status === "ready"
								? `${results.length} locations found.`
								: query.length > 0
									? "Enter at least 2 characters."
									: ""}
			</div>
		</div>
	);
}
