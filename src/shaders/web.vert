// Web-thread vertex shader. Sinusoidal Y-axis displacement for organic sway.
// Used by WebThread mesh geometry (Phase 1 Step 11+). Kept minimal for now.
uniform float uTime;
uniform float uAmplitude;

varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 pos = position;
  float wave = sin(pos.x * 4.0 + uTime * 2.2) * uAmplitude;
  pos.y += wave * (0.5 + 0.5 * cos(uTime * 1.1));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
