import { chromium } from "playwright";
import { API, WEB } from "../scripts/local.mjs";

// The editor batches saves 1500 ms after the last change (SAVE_DELAY in use-bento-store.ts).
const SAVE_QUIET_MS = 2_000;
const inflight = new WeakMap();

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

export async function launchBrowser() {
	return chromium.launch({
		headless: false,
		executablePath:
			process.env.CHROME_PATH ||
			(process.platform === "darwin"
				? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
				: undefined),
	});
}

function track(page) {
	const state = { pending: new Set(), last: Date.now() };
	inflight.set(page, state);
	const done = (request) => {
		if (state.pending.delete(request)) state.last = Date.now();
	};
	page.on("request", (request) => {
		if (request.url().startsWith(API)) {
			state.pending.add(request);
			state.last = Date.now();
		}
	});
	page.on("requestfinished", done);
	page.on("requestfailed", done);
}

export async function settled(page, timeout = 20_000) {
	const state = inflight.get(page);
	if (!state) throw new Error("settled() needs a page opened by journey()");
	// A change made just before this call has not sent its save yet, so the
	// quiet window starts no earlier than now.
	const calledAt = Date.now();
	const until = calledAt + timeout;
	while (Date.now() < until) {
		const quietSince = Math.max(state.last, calledAt);
		if (!state.pending.size && Date.now() - quietSince >= SAVE_QUIET_MS) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`API traffic did not settle within ${timeout} ms`);
}

async function ready(page) {
	await page.waitForFunction(
		() =>
			document.readyState === "complete" &&
			[...document.querySelectorAll("body *")].some((node) =>
				Object.keys(node).some((key) => key.startsWith("__reactProps")),
			),
		undefined,
		{ timeout: 25_000 },
	);
}

export async function gotoReady(page, route) {
	await page.goto(`${WEB}${route}`, { waitUntil: "domcontentloaded" });
	await ready(page);
}

export async function reloadReady(page) {
	await page.reload({ waitUntil: "domcontentloaded" });
	await ready(page);
}

export async function setViewport(page, size) {
	await page.setViewportSize(size);
}

export function createJourneys(browser, { prepareContext, preparePage }) {
	let current;
	const close = async () => {
		const context = current;
		current = undefined;
		await context?.close().catch(() => {});
	};
	return {
		async open(feature, { route, storageState, viewport, permissions } = {}) {
			await close();
			current = await browser.newContext({
				storageState,
				permissions,
				viewport: viewport ?? { width: 1365, height: 900 },
			});
			await current.addInitScript(ignoreResizeObserverLoop);
			await prepareContext?.(current, feature);
			const page = await current.newPage();
			page.setDefaultTimeout(12_000);
			page.setDefaultNavigationTimeout(25_000);
			track(page);
			preparePage?.(page, feature);
			if (route !== undefined) await gotoReady(page, route);
			return page;
		},
		async extra(options = {}) {
			const context = await browser.newContext({
				viewport: { width: 1365, height: 900 },
				...options,
			});
			await context.addInitScript(ignoreResizeObserverLoop);
			await prepareContext?.(context, "extra");
			const page = await context.newPage();
			track(page);
			preparePage?.(page, "extra");
			return page;
		},
		close,
	};
}
