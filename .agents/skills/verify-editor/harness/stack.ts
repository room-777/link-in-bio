// One feature-map run's stack: a random run id and its claimed ports. The run
// id names the run's DB container and state folder and is the nonce its
// Postgres reports, so a run can prove DB_URL reaches its own database.
import { createHash, randomBytes } from "node:crypto";
import {
	closeSync,
	mkdirSync,
	openSync,
	readFileSync,
	unlinkSync,
	writeSync,
} from "node:fs";
import { connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export const RESULTS_DIR = path.join(ROOT, "featuremap-results");
export const LOGS_DIR = path.join(RESULTS_DIR, "logs");
export const SCREENSHOTS_DIR = path.join(RESULTS_DIR, "screenshots");

// The two inspector ports are claimed too: Wrangler and the Cloudflare Vite
// plugin otherwise both default to 9229, and two stacks collide on it.
const SERVICES = [
	"web",
	"api",
	"mock",
	"db",
	"webInspector",
	"apiInspector",
] as const;
type Service = (typeof SERVICES)[number];
export type Ports = Record<Service, number>;
export type Stack = { runId: string; ports: Ports };

const PORT_ENV: Record<Service, string> = {
	web: "FEATUREMAP_WEB_PORT",
	api: "FEATUREMAP_API_PORT",
	mock: "FEATUREMAP_MOCK_PORT",
	db: "FEATUREMAP_DB_PORT",
	webInspector: "FEATUREMAP_WEB_INSPECTOR_PORT",
	apiInspector: "FEATUREMAP_API_INSPECTOR_PORT",
};
// Below the Linux (32768+) and macOS (49152+) ephemeral ranges, so outgoing
// connections never take a claimed port, and away from the 3000/3001 dev servers.
const PORT_RANGE = { min: 20_000, max: 32_000 };
const LOCK_DIR = path.join(tmpdir(), "grabbin-featuremap-locks");

export const dbUrl = (port: number) =>
	`postgres://postgres:postgres@127.0.0.1:${port}/grabbin_featuremap`;

export function stackEnv(stack: Stack): Record<string, string> {
	const env: Record<string, string> = { FEATUREMAP_RUN_ID: stack.runId };
	for (const service of SERVICES)
		env[PORT_ENV[service]] = String(stack.ports[service]);
	return env;
}

/** The stack `bun run featuremap` started, from the environment it passed down. */
export function readStack(env: NodeJS.ProcessEnv): Stack {
	const value = (name: string) => {
		const found = env[name];
		if (!found)
			throw new Error(
				`${name} is unset; start the stack with bun run featuremap`,
			);
		return found;
	};
	const ports = {} as Ports;
	for (const service of SERVICES)
		ports[service] = Number(value(PORT_ENV[service]));
	return { runId: value("FEATUREMAP_RUN_ID"), ports };
}

const alive = (pid: number) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
};

/** Creates the lock file, or returns false when a live process holds it. */
function lock(name: string, owner: string): boolean {
	const file = path.join(LOCK_DIR, name);
	for (;;) {
		try {
			const fd = openSync(file, "wx");
			writeSync(fd, `${process.pid} ${owner}\n`);
			closeSync(fd);
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
		}
		const pid = Number(readFileSync(file, "utf8").split(" ")[0]);
		if (alive(pid)) return false;
		unlinkSync(file);
	}
}

function unlock(name: string, owner: string) {
	const file = path.join(LOCK_DIR, name);
	try {
		if (readFileSync(file, "utf8").trim() === `${process.pid} ${owner}`)
			unlinkSync(file);
	} catch {}
}

/** Throws unless nothing listens on the port and nothing forwards it. */
export async function assertPortFree(port: number, label: string) {
	await new Promise<void>((resolve, reject) => {
		const server = createServer();
		server.once("error", (error: NodeJS.ErrnoException) =>
			reject(
				new Error(
					error.code === "EADDRINUSE"
						? `${label} ${port} is in use`
						: `${label} ${port} could not be checked: ${error.message}`,
				),
			),
		);
		server.listen({ port, host: "127.0.0.1", exclusive: true }, () =>
			server.close(() => resolve()),
		);
	});
	// A port can be forwarded (Docker DNAT) or held on another address with
	// nothing bound on 127.0.0.1, so it must also refuse a connection.
	await new Promise<void>((resolve, reject) => {
		const socket = connect({ port, host: "127.0.0.1" });
		socket.setTimeout(1_000);
		socket.once("connect", () => {
			socket.destroy();
			reject(new Error(`${label} ${port} is in use (it accepts connections)`));
		});
		socket.once("timeout", () => {
			socket.destroy();
			reject(
				new Error(`${label} ${port} could not be checked: connect timed out`),
			);
		});
		socket.once("error", (error: NodeJS.ErrnoException) =>
			error.code === "ECONNREFUSED"
				? resolve()
				: reject(
						new Error(
							`${label} ${port} could not be checked: ${error.message}`,
						),
					),
		);
	});
}

/** Locks this checkout: its featuremap-results/ and dev server serve one run at a time. */
export function claimCheckout(): () => void {
	mkdirSync(LOCK_DIR, { recursive: true });
	const name = `checkout-${createHash("sha256").update(ROOT).digest("hex").slice(0, 16)}`;
	const owner = randomBytes(6).toString("hex");
	if (!lock(name, owner))
		throw new Error(
			`another feature-map run is using ${ROOT}; run a second stack from its own worktree`,
		);
	return () => unlock(name, owner);
}

/**
 * Claims a run id and free ports for one run. Ports named in the
 * environment are used as given; the rest are picked at random. Each port is
 * locked until `release()`, so concurrent runs never share one.
 */
export async function claimStack(
	env: NodeJS.ProcessEnv,
): Promise<{ stack: Stack; release: () => void }> {
	mkdirSync(LOCK_DIR, { recursive: true });
	const runId = randomBytes(6).toString("hex");
	const held: string[] = [];
	const release = () => {
		for (const name of held.splice(0)) unlock(name, runId);
	};
	try {
		const ports = {} as Ports;
		for (const service of SERVICES) {
			const label = PORT_ENV[service];
			const given = env[label];
			if (given) {
				const port = Number(given);
				if (!Number.isInteger(port) || port < 1 || port > 65_535)
					throw new Error(`${label}=${given} is not a port`);
				if (!lock(`port-${port}`, runId))
					throw new Error(
						`${label} ${port} is claimed by another feature-map run`,
					);
				held.push(`port-${port}`);
				await assertPortFree(port, label);
				ports[service] = port;
				continue;
			}
			for (let attempt = 0; ; attempt++) {
				if (attempt === 200)
					throw new Error(`no free port for ${label} after 200 tries`);
				const port =
					PORT_RANGE.min +
					Math.floor(Math.random() * (PORT_RANGE.max - PORT_RANGE.min));
				if (!lock(`port-${port}`, runId)) continue;
				try {
					await assertPortFree(port, label);
				} catch {
					unlock(`port-${port}`, runId);
					continue;
				}
				held.push(`port-${port}`);
				ports[service] = port;
				break;
			}
		}
		return { stack: { runId, ports }, release };
	} catch (error) {
		release();
		throw error;
	}
}

const IDENTITY = "select current_setting('featuremap.run_id', true) as run_id";

/**
 * Requires the Postgres that DB_URL reaches to report this run's id. Any
 * other server (another stack, another Docker daemon's container on the same
 * address) or no server fails, so nothing runs against the wrong database.
 */
export async function assertOwnDatabase(
	url: string,
	runId: string,
	{ migrated = false } = {},
) {
	const client = new pg.Client({
		connectionString: url,
		connectionTimeoutMillis: 5_000,
	});
	client.on("error", () => {});
	try {
		await client.connect();
		const { rows } = await client.query<{ run_id: string | null }>(IDENTITY);
		const answered = rows[0]?.run_id ?? "none";
		if (answered !== runId)
			throw new Error(
				`${url} answers as another database (run id ${answered}, expected ${runId}); another stack or Docker daemon serves this address`,
			);
		if (!migrated) return;
		const tables = await client.query<{ ready: boolean }>(
			"select to_regclass('public.page_items') is not null as ready",
		);
		if (!tables.rows[0]?.ready)
			throw new Error(`${url} has no page_items table; migrations did not run`);
	} finally {
		await client.end().catch(() => {});
	}
}

if (import.meta.main) {
	const command = process.argv[2];
	const stack = readStack(process.env);
	if (command === "ports")
		for (const service of SERVICES)
			await assertPortFree(stack.ports[service], PORT_ENV[service]);
	else if (command === "db" || command === "db-migrated")
		await assertOwnDatabase(dbUrl(stack.ports.db), stack.runId, {
			migrated: command === "db-migrated",
		});
	else throw new Error("usage: stack.ts ports | db | db-migrated");
}
