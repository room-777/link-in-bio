import { RefreshCwIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { Loader } from "reicon-react";
import { Input } from "@/components/ui/input";
import {
  MapboxGeocodingError,
  type MapSearchResult,
  searchMapboxLocations,
} from "@/lib/map/mapbox-geocoding";

export type MapLocationSearchProps = {
  accessToken?: string;
  language?: string;
  disabled?: boolean;
  onSelect(result: MapSearchResult): void;
};

type SearchStatus = "idle" | "loading" | "ready" | "empty" | "error";

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      (error as { name?: unknown }).name === "AbortError")
  );
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof MapboxGeocodingError))
    return "Couldn’t load locations. Try again.";

  switch (error.code) {
    case "missing-token":
      return "Location search is unavailable. Try again.";
    case "http":
    case "network":
      return "Couldn’t load locations. Try again.";
    case "invalid-response":
      return "The location results were invalid. Try again.";
    case "invalid-query":
      return "Enter at least 2 characters.";
  }
}

function getResultLabel(result: MapSearchResult): string {
  return result.address ? `${result.name} · ${result.address}` : result.name;
}

export function MapLocationSearch({
  accessToken,
  language,
  disabled = false,
  onSelect,
}: MapLocationSearchProps): React.ReactElement {
  const [inputValue, setInputValue] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<MapSearchResult[]>([]);
  const [status, setStatus] = React.useState<SearchStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [retryNonce, setRetryNonce] = React.useState(0);
  const requestSequenceRef = React.useRef(0);
  const controllerRef = React.useRef<AbortController | null>(null);
  const searchId = React.useId();
  const inputId = `${searchId}-input`;
  const listboxId = `${searchId}-listbox`;
  const trimmedQuery = searchQuery.trim();

  // biome-ignore lint/correctness/useExhaustiveDependencies: retryNonce intentionally retries the current query.
  React.useEffect(() => {
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
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

    if (trimmedQuery.length < 2) {
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
    const timeoutId = window.setTimeout(() => {
      void searchMapboxLocations(trimmedQuery, {
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
          setErrorMessage(null);
          setStatus(limitedResults.length > 0 ? "ready" : "empty");
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
      window.clearTimeout(timeoutId);
      controller.abort();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [accessToken, disabled, language, retryNonce, trimmedQuery]);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(event.target.value);
    setSearchQuery(event.target.value);
    setIsOpen(true);
  }

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
      setActiveIndex((currentIndex) => {
        if (event.key === "ArrowDown")
          return currentIndex < results.length - 1 ? currentIndex + 1 : 0;
        return currentIndex > 0 ? currentIndex - 1 : results.length - 1;
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (status === "ready" && activeIndex >= 0) {
        const result = results[activeIndex];
        if (result) selectResult(result);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const activeOptionId =
    activeIndex >= 0 ? `${searchId}-option-${activeIndex}` : undefined;
  const showPanel =
    !disabled && isOpen && (status !== "idle" || trimmedQuery.length > 0);
  const hasListbox = showPanel && status === "ready";
  const liveMessage =
    status === "loading"
      ? "Searching locations."
      : status === "empty"
        ? "No locations found."
        : status === "error"
          ? "Location search failed. Try again."
          : status === "ready"
            ? `${results.length} locations found.`
            : trimmedQuery.length > 0
              ? "Enter at least 2 characters."
              : "";

  return (
    <div className="relative w-full">
      <div className="min-h-0 overflow-visible rounded-none bg-transparent p-0">
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (trimmedQuery.length > 0) setIsOpen(true);
            }}
            disabled={disabled}
            aria-autocomplete="list"
            aria-label="Search Location"
            aria-controls={hasListbox ? listboxId : undefined}
            aria-expanded={showPanel}
            aria-haspopup="listbox"
            aria-activedescendant={hasListbox ? activeOptionId : undefined}
            aria-busy={status === "loading"}
            placeholder="Search locations"
            className="h-8 border-0! bg-white/20 pr-9 text-white placeholder:text-white/60 focus-visible:ring-0 rounded-md"
          />
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white"
          />
        </div>

        {showPanel ? (
          <div className="mt-1.5 overflow-hidden bg-black text-white">
            {status === "ready" ? (
              <div
                id={listboxId}
                role="listbox"
                aria-label="Location results"
                className="no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none"
              >
                {results.map((result, index) => (
                  <div
                    key={result.id}
                    id={`${searchId}-option-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    tabIndex={-1}
                    data-active={activeIndex === index || undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectResult(result)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      selectResult(result);
                    }}
                    className="group/command-item relative flex cursor-default items-start gap-2 rounded-sm px-3 py-2 text-left text-sm text-white outline-hidden select-none hover:bg-white/20 data-[active=true]:bg-white/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{result.name}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : status === "loading" ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader aria-hidden="true" className="size-4 animate-spin" />
                Searching locations…
              </div>
            ) : status === "empty" ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                No locations found.
              </div>
            ) : status === "error" ? (
              <div className="flex items-center justify-between gap-3 px-3 py-3 text-sm text-muted-foreground">
                <span>
                  {errorMessage ?? "Couldn’t load locations. Try again."}
                </span>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  onClick={() => setRetryNonce((value) => value + 1)}
                >
                  <RefreshCwIcon aria-hidden="true" className="size-3.5" />
                  Retry
                </button>
              </div>
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                Enter at least 2 characters.
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
    </div>
  );
}
