import * as THREE from 'three';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';

// Small, half-resolution contact shadows. Distances are in metres, not fractions
// of the city's 30 km camera range. Keep the sky and transparent decals out of depth.
export class ContactAOPass extends SSAOPass {
  constructor(scene, camera) {
    super(scene, camera, 1, 1, 16);
    this.kernelRadius = 0.65;
    this.output = SSAOPass.OUTPUT.Default;
    this.copyMaterial.uniforms.strength = { value: 0.38 };
    this.copyMaterial.fragmentShader = this.copyMaterial.fragmentShader
      .replace('uniform float opacity;', 'uniform float opacity;\nuniform float strength;')
      .replace('gl_FragColor = opacity * texel;', 'gl_FragColor = vec4(mix(vec3(1.0), texel.rgb, strength), 1.0);');
    // Blur only across comparable depths so silhouettes retain clean edges.
    this.blurMaterial.uniforms.tDepth = { value: this.normalRenderTarget.depthTexture };
    this.blurMaterial.uniforms.cameraNear = { value: camera.near };
    this.blurMaterial.uniforms.cameraFar = { value: camera.far };
    this.blurMaterial.fragmentShader = /* glsl */ `
      uniform sampler2D tDiffuse, tDepth;
      uniform vec2 resolution;
      uniform float cameraNear, cameraFar;
      varying vec2 vUv;
      #include <packing>
      float distanceAt(vec2 uv) {
        return -perspectiveDepthToViewZ(texture2D(tDepth, uv).r, cameraNear, cameraFar);
      }
      void main() {
        float centre = distanceAt(vUv), total = 0.0, weights = 0.0;
        for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) {
          vec2 uv = vUv + vec2(float(x), float(y)) / resolution;
          float spatial = exp(-float(x * x + y * y) * 0.35);
          float edge = exp(-abs(distanceAt(uv) - centre) / max(0.08, centre * 0.003));
          float weight = spatial * edge;
          total += texture2D(tDiffuse, uv).r * weight;
          weights += weight;
        }
        gl_FragColor = vec4(vec3(total / max(weights, 1e-5)), 1.0);
      }`;
  }

  setSize(width, height) {
    super.setSize(Math.max(1, Math.ceil(width * 0.5)), Math.max(1, Math.ceil(height * 0.5)));
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const hidden = [];
    this.scene.traverseVisible(object => {
      if (!object.isMesh) return;
      const materials = [].concat(object.material ?? []);
      if (materials.some(material => material.name === 'Sky' || material.transparent || !material.depthWrite)) {
        object.visible = false; hidden.push(object);
      }
    });
    const shadows = renderer.shadowMap.enabled;
    renderer.shadowMap.enabled = false;
    const range = this.camera.far - this.camera.near;
    this.minDistance = 0.018 / range;
    this.maxDistance = 0.85 / range;
    this.blurMaterial.uniforms.cameraNear.value = this.camera.near;
    this.blurMaterial.uniforms.cameraFar.value = this.camera.far;
    try { super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive); }
    finally {
      renderer.shadowMap.enabled = shadows;
      hidden.forEach(object => { object.visible = true; });
    }
  }

  get memoryBytes() { return this.width * this.height * 28; }
  dispose() {
    this.ssaoMaterial.dispose();
    this.noiseTexture.dispose();
    super.dispose();
  }
}
