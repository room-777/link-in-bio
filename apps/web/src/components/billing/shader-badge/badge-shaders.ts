export const badgePresets = ["smoke", "satin", "blur"] as const;
export type BadgePreset = (typeof badgePresets)[number];

export const fallbackBackgrounds: Record<BadgePreset, string> = {
	smoke:
		"radial-gradient(120% 90% at 30% 40%, #f5edc7 0%, #4d9acf 45%, #191e29 100%)",
	satin:
		"linear-gradient(180deg, #10568e 0%, #b099d1 45%, #61902f 60%, #10280c 100%)",
	blur: "radial-gradient(120% 100% at 70% 70%, #4f9eff 0%, #224ae0 45%, #0c1c6b 100%)",
};

const shared = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSeed;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
vec3 warp(vec2 p, float t, float k) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.07)), fbm(p + vec2(5.2, 1.3) - t * 0.05));
  vec2 r = vec2(fbm(p + k * q + vec2(1.7, 9.2) + t * 0.04), fbm(p + k * q + vec2(8.3, 2.8) - t * 0.03));
  return vec3(fbm(p + k * r), q);
}
`;

const materials: Record<BadgePreset, string> = {
	smoke: `
vec2 uv = gl_FragCoord.xy / uResolution.y;
float aspect = uResolution.x / uResolution.y;
float t = uTime;
vec2 o = vec2(uSeed * 13.7, uSeed * 7.3);
vec3 w = warp(uv * vec2(0.55, 1.15) + o + vec2(t * 0.14, 0.0), t * 2.4, 2.0);
float f = smoothstep(0.26, 0.70, w.x);
float grain = hash(gl_FragCoord.xy + o * 100.0) - 0.5;
float s = clamp(f + grain * 0.22, 0.0, 1.0);
vec3 navy = vec3(0.098, 0.118, 0.161);
vec3 blue = vec3(0.302, 0.604, 0.812);
vec3 cream = vec3(0.961, 0.929, 0.780);
vec3 col = mix(navy, blue, smoothstep(0.18, 0.55, s));
col = mix(col, cream, smoothstep(0.58, 0.94, s));
float cycle = t * 0.11 + uSeed;
float k = fract(cycle);
float open = smoothstep(0.0, 0.05, k) * (1.0 - smoothstep(0.05, 0.16, k));
vec2 at = vec2(aspect * (0.25 + 0.5 * hash(vec2(floor(cycle), 3.1))), 0.52);
vec2 d = abs(uv - at);
float star = exp(-d.x * 5.0) * exp(-d.y * 70.0) + exp(-d.y * 9.0) * exp(-d.x * 70.0) + exp(-length(d) * 22.0);
col += cream * star * open * 1.4;
gl_FragColor = vec4(col, 1.0);
`,
	satin: `
vec2 uv = gl_FragCoord.xy / uResolution.y;
float aspect = uResolution.x / uResolution.y;
float t = uTime;
vec2 o = vec2(uSeed * 13.7, uSeed * 7.3);
vec2 p = uv * 1.5 + o;
float hill = 0.40 + 0.16 * sin(uv.x * 1.3 + 0.9 + uSeed * 6.0) + 0.12 * (fbm(vec2(uv.x * 1.4 + o.x, t * 0.05)) - 0.5);
float land = smoothstep(hill + 0.03, hill - 0.03, uv.y);
vec3 w = warp(p * vec2(1.0, 1.7) + vec2(t * 0.20, 0.0), t * 2.0, 1.8);
float cloud = smoothstep(0.42, 0.72, w.x);
vec3 sky = vec3(0.063, 0.337, 0.557);
vec3 lilac = vec3(0.690, 0.600, 0.820);
vec3 white = vec3(0.960, 0.965, 0.990);
vec3 col = mix(sky, mix(lilac, white, smoothstep(0.4, 0.75, w.y)), cloud);
float shade = fbm(uv * vec2(1.2, 2.2) + o + vec2(t * 0.02, 0.0));
vec3 grass = mix(vec3(0.063, 0.157, 0.047), vec3(0.380, 0.560, 0.200), smoothstep(0.30, 0.62, shade));
col = mix(col, grass, land);
float h = w.x + land * shade;
float e = 0.02;
vec2 n2 = vec2(fbm((p + vec2(e, 0.0)) * vec2(1.0, 1.7)) - fbm((p - vec2(e, 0.0)) * vec2(1.0, 1.7)), fbm((p + vec2(0.0, e)) * vec2(1.0, 1.7)) - fbm((p - vec2(0.0, e)) * vec2(1.0, 1.7))) / (2.0 * e);
vec3 n = normalize(vec3(-n2 * 0.35, 1.0));
vec3 L = normalize(vec3(cos(t * 0.8), sin(t * 0.8) * 0.6, 1.1));
float spec = pow(max(dot(n, L), 0.0), 12.0);
float rib = 0.5 + 0.5 * sin(dot(gl_FragCoord.xy, normalize(vec2(1.0, 0.42))) * 6.2831 / 4.0);
float band = uv.x - uv.y * 0.6 - (mod(t * 0.9 + uSeed * 4.0, aspect + 3.0) - 1.5);
float sweep = exp(-band * band * 6.0);
float lit = 0.35 * spec + 0.45 * sweep + 0.05 * h;
col *= 0.95 + 0.07 * rib;
col += white * lit * (0.6 + 0.4 * rib);
gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
`,
	blur: `
vec2 uv = gl_FragCoord.xy / uResolution.y;
float t = uTime;
vec2 o = vec2(uSeed * 13.7, uSeed * 7.3);
vec3 w = warp(uv * vec2(1.4, 2.0) + o + vec2(t * 0.16, -t * 0.08), t * 2.8, 2.0);
float f = smoothstep(0.36, 0.64, w.x);
vec3 deep = vec3(0.047, 0.110, 0.420);
vec3 mid = vec3(0.133, 0.290, 0.880);
vec3 light = vec3(0.310, 0.620, 1.000);
vec3 col = mix(deep, mid, smoothstep(0.10, 0.50, f));
col = mix(col, light, smoothstep(0.55, 0.95, f));
col += vec3(0.20, 0.10, 0.45) * smoothstep(0.55, 0.85, w.y) * 0.45;
col += (hash(gl_FragCoord.xy + o * 100.0) - 0.5) * 0.14;
gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
`,
};

export const vertexShader =
	"attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }";
export const fragmentShaders = Object.fromEntries(
	badgePresets.map((preset) => [
		preset,
		`${shared}\nvoid main() {\n${materials[preset]}\n}`,
	]),
) as Record<BadgePreset, string>;
