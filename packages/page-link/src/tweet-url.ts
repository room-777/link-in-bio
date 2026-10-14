const tweetHosts = new Set([
	"x.com",
	"www.x.com",
	"mobile.x.com",
	"twitter.com",
	"www.twitter.com",
	"mobile.twitter.com",
]);

export function getTweetId(value: string) {
	const input = value.trim();
	if (/^\d+$/.test(input)) return input;

	try {
		const url = new URL(input);
		if (url.protocol !== "https:" || !tweetHosts.has(url.hostname)) return null;
		return url.pathname.match(/\/status\/(\d+)(?:\/|$)/)?.[1] ?? null;
	} catch {
		return null;
	}
}
