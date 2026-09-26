// Pointer position on the MCU progress ring → playback time. Angle runs
// clockwise from 12 o'clock, so the top is 0 and a full turn is `duration`.
export function arcToTime(x: number, y: number, cx: number, cy: number, duration: number): number {
  if (!(duration > 0)) return 0
  let a = Math.atan2(x - cx, cy - y)
  if (a < 0) a += Math.PI * 2
  return (a / (Math.PI * 2)) * duration
}
