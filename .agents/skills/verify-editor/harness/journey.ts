import type { BrowserContext, Page, Request } from "@playwright/test";
import { API, WEB } from "./local.ts";

type Inflight = { pending: Set<Request>; idle: Array<() => void> };

// Editor autosaves report their state on data-save-status (bento-editor.tsx,
// page-profile-form.tsx). settled() waits on that state and on in-flight API
// requests, never on a clock.
const inflight = new WeakMap<Page, Inflight>();

// Chrome reports this benign notification as a window error, and the dev
// error overlay turns it into a full-screen dialog that swallows every click.
function ignoreResizeObserverLoop() {
	window.addEventListener(
		"error",
		(event) => {
			if (String(event.message).includes("ResizeObserver loop"))
				event.stopImmediatePropagation();
		},
		true,
	);
}

export async function prepareContext(context: BrowserContext) {
	await context.addInitScript(ignoreResizeObserverLoop);
}

/** Starts the API request bookkeeping settled() needs. Call once per page. */
export function track(page: Page) {
	const state: Inflight = { pending: new Set(), idle: [] };
	inflight.set(page, state);
	const done = (request: Request) => {
		if (!state.pending.delete(request) || state.pending.size) return;
		for (const resolve of state.idle.splice(0)) resolve();
	};
	page.on("request", (request) => {
		if (request.url().startsWith(API)) state.pending.add(request);
	});
	page.on("requestfinished", done);
	page.on("requestfailed", done);
	page.setDefaultTimeout(12_000);
	page.setDefaultNavigationTimeout(25_000);
}

function apiIdle(state: Inflight, timeout: number) {
	if (!state.pending.size) return Promise.resolve();
	return new Promise<void>((resolve, reject) => {
		const deadline = setTimeout(
			() =>
				reject(new Error(`API traffic did not settle within ${timeout} ms`)),
			timeout,
		);
		state.idle.push(() => {
			clearTimeout(deadline);
			resolve();
		});
	});
}

function autosavesSaved(page: Page, timeout: number) {
	return page.waitForFunction(
		() => {
			const statuses = [
				...document.querySelectorAll<HTMLElement>("[data-save-status]"),
			].map((node) => node.dataset.saveStatus);
			if (statuses.includes("error"))
				throw new Error("editor autosave reported data-save-status=error");
			return statuses.every((status) => status === "saved");
		},
		undefined,
		{ timeout, polling: "raf" },
	);
}

/** Waits until every autosave reports saved and no API request is in flight. */
export async function settled(page: Page, timeout = 20_000) {
	const state = inflight.get(page);
	if (!state) throw new Error("settled() needs a page from a journey fixture");
	const until = Date.now() + timeout;
	const left = () => Math.max(1, until - Date.now());
	// A save that finishes can schedule a follow-up save, so loop until both
	// conditions hold at the same moment.
	for (;;) {
		await apiIdle(state, left());
		await autosavesSaved(page, left());
		if (!state.pending.size) return;
	}
}

async function ready(page: Page, timeout = 25_000) {
	await page.waitForFunction(
		() =>
			document.readyState === "complete" &&
			[...document.querySelectorAll("body *")].some((node) =>
				Object.keys(node).some((key) => key.startsWith("__reactProps")),
			),
		undefined,
		{ timeout },
	);
}

export async function gotoReady(page: Page, route: string, timeout?: number) {
	await page.goto(`${WEB}${route}`, { waitUntil: "domcontentloaded", timeout });
	await ready(page, timeout);
}

export async function reloadReady(page: Page) {
	await page.reload({ waitUntil: "domcontentloaded" });
	await ready(page);
}
