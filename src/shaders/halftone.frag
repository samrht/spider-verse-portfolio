// Halftone-loader fragment shader.
// Dissolves a full-screen halftone dot grid as uProgress rises 0 -> 1.
precision highp float;

uniform float uTime;
uniform float uProgress;
uniform vec2  uResolution;

const vec3 BG_COL  = vec3(0.039, 0.0, 0.082);   // #0a0015 — Earth-1610 bg
const vec3 DOT_COL = vec3(1.0,   0.176, 0.176); // #ff2d2d — Earth-1610 primary

void main() {
  vec2 frag = gl_FragCoord.xy;

  // Halftone cell size in device pixels. Slightly breathes with time.
  float cellSize = 10.0 + sin(uTime * 1.4) * 1.2;
  vec2 cellCenter = (floor(frag / cellSize) + 0.5) * cellSize;
  float distToCenter = length(frag - cellCenter);

  // Radial falloff from screen center adds a vignette dissolve order.
  vec2 ndc = (frag - 0.5 * uResolution) / uResolution.y;
  float radial = length(ndc);

  // Each dot starts near cellSize/2 and shrinks to 0 as progress -> 1.
  // Outer dots dissolve first via radial offset.
  float prog = clamp(uProgress + radial * 0.45, 0.0, 1.0);
  float pulse = 0.85 + 0.15 * sin(uTime * 3.0 + radial * 6.0);
  float radius = (cellSize * 0.45) * (1.0 - prog) * pulse;

  float edge = 1.2;
  float dotMask = 1.0 - smoothstep(radius - edge, radius + edge, distToCenter);

  vec3 col = mix(BG_COL, DOT_COL, dotMask);
  float alpha = mix(1.0, 0.0, uProgress) * (0.25 + dotMask * 0.75);

  gl_FragColor = vec4(col, alpha);
}
