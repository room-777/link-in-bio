import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:net";
import path from "node:path";
import {
	claimStack,
	waitForOwnDatabase,
} from "../.agents/skills/verify-editor/harness/stack";

const STACK = path.join(
	import.meta.dir,
	"../.agents/skills/verify-editor/harness/stack.ts",
);
const servers: Server[] = [];
afterEach(() => {
	for (const server of servers.splice(0)) server.close();
});

function listen(server: Server): Promise<number> {
	servers.push(server);
	return new Promise((resolve) =>
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			resolve(typeof address === "object" && address ? address.port : 0);
		}),
	);
}

/** Speaks just enough of the Postgres wire protocol to answer one-column queries. */
function fakePostgres(runId: string): Server {
	const message = (type: string, body: Buffer) => {
		const head = Buffer.alloc(5);
		head.write(type, 0, "latin1");
		head.writeInt32BE(body.length + 4, 1);
		return Buffer.concat([head, body]);
	};
	const int32 = (value: number) => {
		const buffer = Buffer.alloc(4);
		buffer.writeInt32BE(value);
		return buffer;
	};
	const int16 = (value: number) => {
		const buffer = Buffer.alloc(2);
		buffer.writeInt16BE(value);
		return buffer;
	};
	const ready = message("Z", Buffer.from("I"));
	return createServer((socket) => {
		let started = false;
		socket.on("data", (chunk) => {
			if (!started) {
				started = true;
				socket.write(Buffer.concat([message("R", int32(0)), ready]));
				return;
			}
			if (chunk[0] === 0x58) return socket.end();
			const value = Buffer.from(runId);
			socket.write(
				Buffer.concat([
					message(
						"T",
						Buffer.concat([
							int16(1),
							Buffer.from("run_id\0"),
							int32(0),
							int16(0),
							int32(25),
							int16(-1),
							int32(-1),
							int16(0),
						]),
					),
					message("D", Buffer.concat([int16(1), int32(value.length), value])),
					message("C", Buffer.from("SELECT 1\0")),
					ready,
				]),
			);
		});
	});
}

/** Claims a stack in a separate process and prints its ports while holding the claim. */
function claimInChild(): Promise<{
	ports: Record<string, number>;
	stop: () => Promise<unknown>;
}> {
	const child = spawn(
		process.execPath,
		[
			"-e",
			`const { claimStack } = await import(${JSON.stringify(STACK)});
			const { stack, release } = await claimStack({});
			console.log(JSON.stringify(stack.ports));
			process.stdin.on("data", () => { release(); process.exit(0); });`,
		],
		{ stdio: ["pipe", "pipe", "inherit"] },
	);
	return new Promise((resolve, reject) => {
		child.stdout.once("data", (chunk: Buffer) =>
			resolve({
				ports: JSON.parse(chunk.toString()),
				stop: () => {
					child.stdin.write("\n");
					return new Promise((exited) => child.once("exit", exited));
				},
			}),
		);
		child.once("exit", (code) =>
			reject(new Error(`claim exited ${code} before printing its ports`)),
		);
	});
}

describe("feature-map stack isolation", () => {
	test("concurrent runs claim disjoint ports and never the dev ports", async () => {
		const claims = await Promise.all([1, 2, 3, 4].map(claimInChild));
		const ports = claims.flatMap((claim) => Object.values(claim.ports));
		await Promise.all(claims.map((claim) => claim.stop()));
		expect(ports).toHaveLength(16);
		expect(new Set(ports).size).toBe(16);
		for (const devPort of [3000, 3001, 3002, 15432])
			expect(ports).not.toContain(devPort);
	});

	test("a port held by another claim is refused", async () => {
		const first = await claimStack({});
		try {
			await expect(
				claimStack({ FEATUREMAP_DB_PORT: String(first.stack.ports.db) }),
			).rejects.toThrow(/FEATUREMAP_DB_PORT .* is claimed by another/);
		} finally {
			first.release();
		}
	});

	test("an explicit port another process listens on is refused", async () => {
		const port = await listen(createServer());
		await expect(
			claimStack({ FEATUREMAP_DB_PORT: String(port) }),
		).rejects.toThrow(/FEATUREMAP_DB_PORT .* is in use/);
	});

	test("a foreign Postgres on the DB port is rejected before migrating", async () => {
		const port = await listen(fakePostgres("another-run"));
		await expect(
			waitForOwnDatabase(
				`postgres://postgres:postgres@127.0.0.1:${port}/grabbin_featuremap`,
				"this-run",
				5_000,
			),
		).rejects.toThrow(/answers as another database/);
	});

	test("the run's own Postgres is accepted", async () => {
		const port = await listen(fakePostgres("this-run"));
		await waitForOwnDatabase(
			`postgres://postgres:postgres@127.0.0.1:${port}/grabbin_featuremap`,
			"this-run",
			5_000,
		);
	});
});
