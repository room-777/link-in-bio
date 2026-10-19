import { appendFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.env.OUTBOUND_PROXY_PORT ?? 3002);
const html = `<!doctype html><html><head><title>Feature Map Sample</title><meta property="og:title" content="Feature Map Sample"><meta property="og:description" content="Local preview fixture"><meta property="og:image" content="https://images.example.test/feature-map.png"></head><body>Feature Map Sample</body></html>`;

const server = createServer(async (request, response) => {
	if (request.method === "GET" && request.url === "/health") {
		response
			.writeHead(200, { "content-type": "application/json" })
			.end('{"mode":"mock","upstreamConnections":0}');
		return;
	}
	if (request.method !== "POST" || request.url !== "/fetch") {
		response.writeHead(404).end("Not found");
		return;
	}

	let body = "";
	for await (const chunk of request) body += chunk;
	let target;
	try {
		target = new URL(JSON.parse(body).url);
	} catch {
		response.writeHead(400).end("Invalid request");
		return;
	}

	let status = 200;
	let contentType = "text/html; charset=utf-8";
	let payload = html;
	appendFileSync(
		process.env.OUTBOUND_MOCK_LOG ?? "/dev/null",
		`${target.hostname}${target.pathname}\n`,
	);
	if (target.hostname === "simpleanalytics.com") {
		contentType = "application/json";
		payload = JSON.stringify({ pageviews: 12 });
	} else if (
		target.hostname === "embed.spotify.com" ||
		(target.hostname === "open.spotify.com" &&
			target.pathname.includes("/embed/"))
	) {
		const id =
			target.searchParams.get("uri")?.split(":").at(-1) ??
			target.pathname.split("/").at(-1) ??
			"local-track";
		const entity = {
			name: "Feature Map Track",
			title: "Feature Map Track",
			type: "track",
			uri: `spotify:track:${id}`,
			subtitle: "Local Fixture Artist",
			artists: [{ name: "Local Fixture Artist" }],
			images: [
				{
					url: "https://images.example.test/spotify.png",
					width: 640,
					height: 640,
				},
			],
			duration: 180000,
			isPlayable: false,
			audioPreview: { url: "" },
		};
		const initialState = Buffer.from(
			JSON.stringify({ data: { entity } }),
		).toString("base64");
		payload = `<!doctype html><html><body><script id="initial-state">${initialState}</script></body></html>`;
	} else if (target.hostname === "react-tweet.vercel.app") {
		const id = target.pathname.split("/").at(-1) ?? "";
		contentType = "application/json";
		status = id === "0" ? 404 : 200;
		payload = JSON.stringify({
			data: {
				id_str: id,
				text: "Local mock Tweet",
				created_at: "Mon Jan 01 00:00:00 +0000 2024",
				display_text_range: [0, 16],
				favorite_count: 3,
				user: {
					name: "Feature Map",
					screen_name: "featuremap",
					profile_image_url_https: "https://images.example.test/avatar.png",
				},
				entities: {},
			},
		});
	} else if (
		target.hostname.endsWith("example.test") &&
		target.pathname.endsWith("/invalid")
	) {
		status = 404;
		payload = "Not found";
	} else if (/rss|feed/i.test(target.pathname)) {
		contentType = "application/rss+xml; charset=utf-8";
		payload = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feature Map Feed</title><item><title>Local fixture</title><link>https://example.test/post</link><description>Mock RSS item</description></item></channel></rss>`;
	}
	const result = {
		status,
		statusText: "OK",
		headers: { "content-type": contentType },
		body: Buffer.from(payload).toString("base64"),
	};
	response
		.writeHead(200, { "content-type": "application/json" })
		.end(JSON.stringify(result));
});

server.listen(port, "127.0.0.1", () => {
	process.stdout.write(`mock outbound ready port=${port}\n`);
});
