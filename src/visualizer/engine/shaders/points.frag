// Halftone dot, drawn per universe (spec §5): 0 ink on newsprint, 1 hologram,
// 2 flat cel with ink ring, 3 glitch (today's look; the split is CSS).
precision highp float;

uniform vec3 uPalette[3];
uniform float uBeat;
uniform int uStyle;
uniform vec3 uInk;
uniform float uTime;
uniform float uMotion;   // 1 normal, 0 reduced motion

varying float vSeed;
varying float vDepth;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  int idx = int(floor(vSeed * 2.999));
  vec3 col = idx == 0 ? uPalette[0] : (idx == 1 ? uPalette[1] : uPalette[2]);
  float alpha;
  if (uStyle == 0) {
    // ink: hard opaque disc; depth fades toward the paper, not to glow
    alpha = mix(1.0, 0.55, vDepth);
  } else if (uStyle == 1) {
    // hologram: soft falloff, slow per-dot flicker, brightness pulse on beat
    float fall = 1.0 - smoothstep(0.0, 0.25, r2);
    float flick = 1.0 - uMotion * 0.25 * (0.5 + 0.5 * sin(uTime * 3.0 + vSeed * 40.0));
    col = mix(col, vec3(1.0), uBeat * 0.6);
    alpha = fall * flick * mix(0.9, 0.35, vDepth);
  } else if (uStyle == 2) {
    // cel: flat fill with an ink outline ring
    if (r2 > 0.16) col = uInk;
    alpha = 1.0;
  } else {
    // glitch: today's hard disc with a white core bloom on the beat
    float core = 1.0 - smoothstep(0.0, 0.25, r2);
    col = mix(col, vec3(1.0), uBeat * core * 0.8);
    alpha = mix(0.95, 0.45, vDepth);
  }
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
