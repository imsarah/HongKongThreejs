// Slots match tools/import-polyhaven.mjs: tiles, concrete, wood, terrazzo.
// Shared atlases keep the added materials to three texture samplers.
export const BUILDING_SURFACE_GLSL = /* glsl */`
#ifdef HK_SCAN_SURFACES
uniform sampler2D hkSurfacesColor, hkSurfacesNormal, hkSurfacesArm;
uniform float hkSurfaceTexel;
vec2 hkSurfaceUv(vec2 p, float slot) {
  vec2 cell = vec2(mod(slot, 2.0), 1.0 - floor(slot / 2.0));
  return cell * 0.5 + vec2(hkSurfaceTexel * 1.5) + fract(p) * (0.5 - hkSurfaceTexel * 3.0);
}
vec3 hkSurfaceAlbedo(vec2 p, float slot) {
  float scale = 0.5 - hkSurfaceTexel * 3.0;
  // The GPU decodes sRGB albedo. Explicit gradients avoid mip spikes at repeats.
  return textureGrad(hkSurfacesColor, hkSurfaceUv(p, slot), dFdx(p) * scale, dFdy(p) * scale).rgb;
}
vec3 hkSurfaceNormalMap(vec2 p, float slot) {
  float scale = 0.5 - hkSurfaceTexel * 3.0;
  return textureGrad(hkSurfacesNormal, hkSurfaceUv(p, slot), dFdx(p) * scale, dFdy(p) * scale).rgb * 2.0 - 1.0;
}
vec3 hkSurfaceArm(vec2 p, float slot) {
  float scale = 0.5 - hkSurfaceTexel * 3.0;
  return textureGrad(hkSurfacesArm, hkSurfaceUv(p, slot), dFdx(p) * scale, dFdy(p) * scale).rgb;
}
#endif
`;
