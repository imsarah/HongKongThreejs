// Render density stays within the pixel budget, including oversized/high-DPI displays.
export function basePixelRatio(width, height, dpr, quality) {
  const area = Math.max(1, width) * Math.max(1, height);
  return Math.min(dpr, quality.maxDpr, Math.sqrt(quality.maxPixels / area));
}

// Ordinary load shedding keeps at least one render pixel per CSS pixel where the
// budget allows it. The GPU timeout guard can still go lower in an emergency.
export function clarityScaleFloor(width, height, dpr, quality) {
  if (quality.tier === 'high') return 0.6;
  return Math.min(quality.renderScale, 1 / basePixelRatio(width, height, dpr, quality));
}
