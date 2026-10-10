import * as THREE from 'three';
import { QUALITY } from '../quality.js';

const sets = new Map();
let pending;

export function preloadCityTextures() {
  if (pending) return pending;
  const size = QUALITY.tier === 'low' ? 512 : 1024;
  const loader = new THREE.TextureLoader();
  pending = Promise.all(['asphalt_02', 'herringbone_brick_03', 'painted_plaster_wall'].map(async id => {
    const textures = await Promise.allSettled(['color', 'normal', 'arm'].map(async kind => {
      const texture = await loader.loadAsync(`${import.meta.env.BASE_URL}textures/city/${id}_${kind}_${size}.webp`);
      texture.name = `${id}/${kind}`;
      texture.colorSpace = kind === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = QUALITY.tier === 'low' ? 4 : 8;
      texture.userData.size = [size, size];
      return texture;
    }));
    if (textures.some(result => result.status === 'rejected')) {
      for (const result of textures) if (result.status === 'fulfilled') result.value.dispose();
      console.warn(`City texture set ${id} unavailable; using procedural surfaces.`);
      return;
    }
    const [color, normal, arm] = textures.map(result => result.value);
    sets.set(id, { color, normal, arm });
  }));
  return pending;
}

export const cityTextureSet = id => sets.get(id);
export const cityTextureMaps = () => [...sets.values()].flatMap(set => Object.values(set));
