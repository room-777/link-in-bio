export function normalizeHttpsUrl(value: string) {
	const trimmedValue = value.trim();
	if (!trimmedValue || /\s/.test(trimmedValue)) return;

	try {
		const parsedUrl = new URL(trimmedValue);
		return parsedUrl.protocol === "https:" &&
			parsedUrl.hostname &&
			!parsedUrl.hostname.includes("%")
			? parsedUrl.toString()
			: undefined;
	} catch {
		if (/^[a-z][a-z\d+.-]*:/i.test(trimmedValue)) return;
		try {
			const parsedUrl = new URL(`https://${trimmedValue}`);
			return parsedUrl.hostname && !parsedUrl.hostname.includes("%")
				? parsedUrl.toString()
				: undefined;
		} catch {
			return undefined;
		}
	}
}
