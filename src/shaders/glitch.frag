// Universe-transition fragment shader.
// Pixel-shred glitch overlay. uIntensity ramps 0 -> 1 -> 0 over 600ms.
precision highp float;

uniform float uTime;
uniform float uIntensity;
uniform vec2  uResolution;
uniform vec3  uColorA; // outgoing universe primary
uniform vec3  uColorB; // incoming universe primary

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // Horizontal band slicing. Each band gets a random horizontal shift.
  float bandH = 0.018 + 0.06 * hash21(vec2(floor(uv.y * 22.0), 0.0));
  float bandIdx = floor(uv.y / bandH);
  float tStep = floor(uTime * 40.0);
  float shift = (hash21(vec2(bandIdx, tStep)) - 0.5) * uIntensity * 0.6;

  // Pixel-shred mask: random per-cell on/off, with bands shifted in X.
  vec2 cell = vec2(floor((uv.x + shift) * 220.0), bandIdx + tStep * 0.13);
  float on = step(0.45, hash21(cell));

  // RGB channel split between the two universe primaries.
  float chanSplit = uIntensity * 0.015;
  float maskA = step(0.5, hash21(cell + 1.0 + chanSplit));
  float maskB = step(0.5, hash21(cell - 1.0 - chanSplit));
  vec3 col = mix(uColorA, uColorB, maskA * (1.0 - maskB));

  // Scanline texture rides on top, modulating brightness.
  float scan = 0.65 + 0.35 * step(0.5, fract(uv.y * uResolution.y * 0.35));

  // Per-pixel high-frequency noise sprinkle.
  float sprinkle = step(0.985, hash21(uv * 600.0 + tStep));

  vec3 outCol = col * scan + vec3(sprinkle);
  float alpha = uIntensity * (0.55 + 0.45 * on);

  gl_FragColor = vec4(outCol, alpha);
}
