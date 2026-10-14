const PREVIEW_MAX_EDGE = 32;
const MAX_PREVIEW_DATA_URL_LENGTH = 8_192;

export async function createMediaPlaceholderDataUrl(file: File) {
	try {
		if (file.type.startsWith("video/")) {
			return await createVideoPlaceholder(file);
		}
		if (!file.type.startsWith("image/")) return undefined;

		const bitmap = await createImageBitmap(file, {
			resizeWidth: PREVIEW_MAX_EDGE,
			resizeQuality: "low",
		});
		try {
			return toPlaceholderDataUrl(bitmap, bitmap.width, bitmap.height);
		} finally {
			bitmap.close();
		}
	} catch {
		return undefined;
	}
}

async function createVideoPlaceholder(file: File) {
	const video = document.createElement("video");
	const objectUrl = URL.createObjectURL(file);
	video.muted = true;
	video.playsInline = true;
	video.preload = "auto";

	try {
		const loadedData = waitForVideoEvent(video, "loadeddata", 2_000);
		video.src = objectUrl;
		await loadedData;

		const frameTime = Number.isFinite(video.duration)
			? Math.min(0.1, video.duration / 2)
			: 0;
		if (frameTime > 0 && Math.abs(video.currentTime - frameTime) > 0.01) {
			const seeked = waitForVideoEvent(video, "seeked", 1_000);
			video.currentTime = frameTime;
			await seeked;
		}

		return toPlaceholderDataUrl(video, video.videoWidth, video.videoHeight);
	} catch {
		return undefined;
	} finally {
		video.pause();
		video.removeAttribute("src");
		video.load();
		URL.revokeObjectURL(objectUrl);
	}
}

function waitForVideoEvent(
	video: HTMLVideoElement,
	eventName: "loadeddata" | "seeked",
	timeoutMs: number,
) {
	return new Promise<void>((resolve, reject) => {
		const timeoutId = window.setTimeout(() => finish(false), timeoutMs);
		const onSuccess = () => finish(true);
		const onError = () => finish(false);

		function finish(success: boolean) {
			window.clearTimeout(timeoutId);
			video.removeEventListener(eventName, onSuccess);
			video.removeEventListener("error", onError);
			if (success) resolve();
			else reject(new Error("Media preview could not be decoded."));
		}

		video.addEventListener(eventName, onSuccess, { once: true });
		video.addEventListener("error", onError, { once: true });
	});
}

function toPlaceholderDataUrl(
	source: CanvasImageSource,
	width: number,
	height: number,
) {
	if (!width || !height) return undefined;
	const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(width, height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width * scale));
	canvas.height = Math.max(1, Math.round(height * scale));
	const context = canvas.getContext("2d");
	if (!context) return undefined;
	context.drawImage(source, 0, 0, canvas.width, canvas.height);

	const dataUrl = canvas.toDataURL("image/jpeg", 0.3);
	return dataUrl.length <= MAX_PREVIEW_DATA_URL_LENGTH ? dataUrl : undefined;
}
