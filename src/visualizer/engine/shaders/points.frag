// Hard-edged disc so each point reads as a printed halftone dot.
precision highp float;

uniform vec3 uPalette[3];
uniform float uBeat;

varying float vSeed;
varying float vDepth;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  int idx = int(floor(vSeed * 2.999));
  vec3 col = idx == 0 ? uPalette[0] : (idx == 1 ? uPalette[1] : uPalette[2]);
  // beat: white core bloom
  float core = 1.0 - smoothstep(0.0, 0.25, r2);
  col = mix(col, vec3(1.0), uBeat * core * 0.8);
  float alpha = mix(0.95, 0.45, vDepth);
  gl_FragColor = vec4(col, alpha);
}
