import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { QUALITY } from '../quality.js';

let pending;
export function preloadEnvironment() {
  if (pending) return pending;
  const size = { high: '4k', medium: '2k', low: '1k' }[QUALITY.tier];
  const root = `${import.meta.env.BASE_URL}environments/`;
  pending = Promise.all([
    new HDRLoader().loadAsync(`${root}modern_evening_street_${size}.hdr`),
    fetch(`${root}source.json`).then(response => {
      if (!response.ok) throw new Error(`HDRI metadata: ${response.status}`);
      return response.json();
    }),
  ]).then(([texture, source]) => {
    texture.name = `${source.id}/${size}`;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.wrapS = THREE.RepeatWrapping;
    texture.userData.size = [texture.image.width, texture.image.height];
    return { texture, source };
  }).catch(error => {
    console.warn('HDRI unavailable; using the procedural sky.', error);
    return null;
  });
  return pending;
}
