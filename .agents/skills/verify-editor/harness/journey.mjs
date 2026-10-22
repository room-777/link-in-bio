import { chromium } from "playwright";
import { API, WEB } from "../scripts/local.mjs";

// Editor autosaves report their state on data-save-status (bento-editor.tsx,
// page-profile-form.tsx). settled() waits on that state and on in-flight API
// requests, never on a clock.
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
	const state = { pending: new Set(), idle: [] };
	inflight.set(page, state);
	const done = (request) => {
		if (!state.pending.delete(request) || state.pending.size) return;
		for (const resolve of state.idle.splice(0)) resolve();
	};
	page.on("request", (request) => {
		if (request.url().startsWith(API)) state.pending.add(request);
	});
	page.on("requestfinished", done);
	page.on("requestfailed", done);
}

function apiIdle(state, timeout) {
	if (!state.pending.size) return Promise.resolve();
	return new Promise((resolve, reject) => {
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

function autosavesSaved(page, timeout) {
	return page.waitForFunction(
		() => {
			const statuses = [...document.querySelectorAll("[data-save-status]")].map(
				(node) => node.dataset.saveStatus,
			);
			if (statuses.includes("error"))
				throw new Error("editor autosave reported data-save-status=error");
			return statuses.every((status) => status === "saved");
		},
		undefined,
		{ timeout, polling: "raf" },
	);
}

export async function settled(page, timeout = 20_000) {
	const state = inflight.get(page);
	if (!state) throw new Error("settled() needs a page opened by journey()");
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
	const timings = [];
	const close = async () => {
		const context = current;
		current = undefined;
		const open = timings.at(-1);
		if (open && open.endedAt === undefined) {
			open.endedAt = new Date().toISOString();
			open.seconds =
				(Date.parse(open.endedAt) - Date.parse(open.startedAt)) / 1000;
		}
		await context?.close().catch(() => {});
	};
	return {
		timings,
		async open(feature, { route, storageState, viewport, permissions } = {}) {
			await close();
			timings.push({ feature, startedAt: new Date().toISOString() });
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
