// React reports a hydration mismatch and keeps the server-rendered attributes,
// so the page shows a state the app no longer has, such as a control that
// stays disabled after its data loaded. A bare empty `style` attribute is the
// one exception: it changes nothing on screen, the server HTML does not
// contain it and the client does not render it, so a DOM write outside React
// put it there.
const HYDRATION_MISMATCH =
	/hydrated but some attributes of the server rendered HTML didn't match|Hydration failed/;
const EMPTY_STYLE = /^- style=\{\{\}\}$/;

/** The `+ client` / `- server` attribute lines of React's mismatch diff. */
function mismatchDiff(text: string) {
	return text
		.split("\n")
		.filter((line) => /^\s*[+-]\s{2,}\S/.test(line))
		.map((line) => line.trim().replace(/\s+/, " "));
}

/**
 * A one-line summary when a browser console error is a hydration mismatch
 * that leaves state on screen, otherwise undefined.
 */
export function stateMismatch(text: string): string | undefined {
	if (!HYDRATION_MISMATCH.test(text)) return;
	const diff = mismatchDiff(text);
	if (diff.length && diff.every((line) => EMPTY_STYLE.test(line))) return;
	return `${text.split("\n")[0]} Diff: ${diff.join(" ") || "(none)"}`;
}
