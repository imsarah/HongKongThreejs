// Budget and clarity-floor math against the actual tier settings, including retina and 8K.
import assert from 'node:assert/strict';
import { basePixelRatio, clarityScaleFloor } from '../src/renderer/resolution.js';
globalThis.window = globalThis;
globalThis.document = { createElement: () => ({ getContext: () => null }) };
globalThis.matchMedia = () => ({ matches: false });
globalThis.screen = { width: 1920, height: 1080 };
globalThis.devicePixelRatio = 1;
let cases = 0;
for (const tier of ['low', 'medium', 'high']) {
  globalThis.location = { search: `?quality=${tier}` };
  const { QUALITY: q } = await import(`../src/quality.js?${tier}`);
  for (const [w, h, dpr] of [[375, 667, 2], [390, 844, 3], [844, 390, 3], [430, 932, 3],
    [1366, 768, 1], [1920, 1080, 1], [1440, 900, 2], [3840, 2160, 2], [7680, 4320, 2]]) {
    const base = basePixelRatio(w, h, dpr, q), floor = clarityScaleFloor(w, h, dpr, q);
    assert.ok(w * h * base ** 2 <= q.maxPixels + 1, `${tier}: viewport stays within pixel budget`);
    assert.ok(base <= dpr && base <= q.maxDpr);
    assert.ok(floor > 0 && floor <= q.renderScale);
    if (tier !== 'high' && w * h <= q.maxPixels) {
      assert.ok(base * floor >= 1 - 1e-9, `${tier}: ordinary tuning preserves CSS pixel density`);
    }
    cases++;
  }
  if (tier === 'low') { assert.equal(q.renderScale, 1); assert.equal(q.signAtlas, 1); assert.equal(q.bloom, false); }
  if (tier !== 'high') assert.ok(basePixelRatio(1920, 1080, 1, q) >= 1);
}
console.log(`PASS ${cases} viewport/tier budgets and clarity floors`);
