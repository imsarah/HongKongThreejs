// Keep a useful horizontal view in portrait without changing landscape framing.
export function viewportFov(vertical, aspect, minHorizontal = 40) {
  const portrait = 2 * Math.atan(Math.tan(minHorizontal * Math.PI / 360) / Math.max(0.1, aspect)) * 180 / Math.PI;
  return Math.min(90, Math.max(vertical, portrait));
}
