import {
	type BadgePreset,
	fragmentShaders,
	vertexShader,
} from "./badge-shaders";

type Program = {
	program: WebGLProgram;
	resolution: WebGLUniformLocation | null;
	time: WebGLUniformLocation | null;
	seed: WebGLUniformLocation | null;
};
type Entry = {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	program: Program;
	seed: number;
	width: number;
	height: number;
	visible: boolean;
};

let gl: WebGLRenderingContext | null | undefined;
let sharedCanvas: HTMLCanvasElement | null = null;
let buffer: WebGLBuffer | null = null;
let entries: Entry[] = [];
let frame = 0;
let time = 0;
let lastTime = 0;
let seedIndex = 0;
let reducedMotion = false;
let failed = false;
let motionQuery: MediaQueryList | null = null;
const programs = new Map<BadgePreset, Program | null>();

function shader(type: number, source: string) {
	if (!gl) return null;
	const result = gl.createShader(type);
	if (!result) return null;
	gl.shaderSource(result, source);
	gl.compileShader(result);
	if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
		gl.deleteShader(result);
		return null;
	}
	return result;
}

function getProgram(preset: BadgePreset): Program | null {
	if (programs.has(preset)) return programs.get(preset) ?? null;
	if (!gl) return null;
	const vertex = shader(gl.VERTEX_SHADER, vertexShader);
	const fragment = shader(gl.FRAGMENT_SHADER, fragmentShaders[preset]);
	const program = vertex && fragment ? gl.createProgram() : null;
	if (!program || !vertex || !fragment) {
		if (vertex) gl.deleteShader(vertex);
		if (fragment) gl.deleteShader(fragment);
		programs.set(preset, null);
		return null;
	}
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.bindAttribLocation(program, 0, "aPos");
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		programs.set(preset, null);
		return null;
	}
	const result = {
		program,
		resolution: gl.getUniformLocation(program, "uResolution"),
		time: gl.getUniformLocation(program, "uTime"),
		seed: gl.getUniformLocation(program, "uSeed"),
	};
	programs.set(preset, result);
	return result;
}

function init() {
	if (gl !== undefined) return !!gl;
	sharedCanvas = document.createElement("canvas");
	gl = sharedCanvas.getContext("webgl", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
	});
	if (!gl) return false;
	buffer = gl.createBuffer();
	if (!buffer) {
		gl = null;
		return false;
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	reducedMotion = motionQuery.matches;
	motionQuery.addEventListener("change", onMotionChange);
	document.addEventListener("visibilitychange", run);
	return true;
}

function onMotionChange(event: MediaQueryListEvent) {
	reducedMotion = event.matches;
	run();
}

function draw(entry: Entry) {
	if (!gl || !sharedCanvas || !entry.width || !entry.height) return;
	sharedCanvas.width = Math.max(sharedCanvas.width, entry.width);
	sharedCanvas.height = Math.max(sharedCanvas.height, entry.height);
	gl.viewport(0, 0, entry.width, entry.height);
	gl.useProgram(entry.program.program);
	gl.uniform2f(entry.program.resolution, entry.width, entry.height);
	gl.uniform1f(entry.program.time, time);
	gl.uniform1f(entry.program.seed, entry.seed);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
	entry.context.drawImage(
		sharedCanvas,
		0,
		sharedCanvas.height - entry.height,
		entry.width,
		entry.height,
		0,
		0,
		entry.width,
		entry.height,
	);
}

function run() {
	if (frame) cancelAnimationFrame(frame);
	frame = 0;
	const visible = entries.filter((entry) => entry.visible);
	if (!visible.length) return;
	if (reducedMotion || document.hidden) {
		for (const entry of visible) draw(entry);
		return;
	}
	lastTime = 0;
	frame = requestAnimationFrame(tick);
}

function tick(now: number) {
	frame = 0;
	if (
		!entries.some((entry) => entry.visible) ||
		reducedMotion ||
		document.hidden
	)
		return run();
	if (lastTime) time += Math.min((now - lastTime) / 1000, 1 / 30);
	lastTime = now;
	for (const entry of entries) if (entry.visible) draw(entry);
	frame = requestAnimationFrame(tick);
}

export function registerBadge(
	canvas: HTMLCanvasElement,
	preset: BadgePreset,
): (() => void) | null {
	if (failed || !init()) {
		failed = true;
		return null;
	}
	const context = canvas.getContext("2d");
	const program = getProgram(preset);
	if (!context || !program) return null;
	const entry: Entry = {
		canvas,
		context,
		program,
		seed: (seedIndex++ * 0.618034) % 1,
		width: 0,
		height: 0,
		visible: false,
	};
	const resize = () => {
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		const width = Math.round(canvas.clientWidth * ratio);
		const height = Math.round(canvas.clientHeight * ratio);
		if (width === entry.width && height === entry.height) return;
		entry.width = width;
		entry.height = height;
		canvas.width = width;
		canvas.height = height;
		draw(entry);
	};
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(canvas);
	const intersectionObserver = new IntersectionObserver(([observation]) => {
		entry.visible = observation?.isIntersecting ?? false;
		if (entry.visible) draw(entry);
		run();
	});
	intersectionObserver.observe(canvas);
	entries.push(entry);
	resize();
	return () => {
		resizeObserver.disconnect();
		intersectionObserver.disconnect();
		entries = entries.filter((item) => item !== entry);
		run();
	};
}
