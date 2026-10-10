// Convert Mixamo's public rigged viewer assets into source GLBs for people.py.
// Only the embedded game assets are distributed; downloads stay in ignored .perf/.
// Usage: node tools/import-mixamo.mjs [josh shannon suzie martha]
import fs from 'node:fs/promises';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Quaternion, Vector3 } from 'three';

const characters = {
  josh: ['3bcbf3bf-63f7-435e-ba9e-f3f137aa639d', 'bryce'],
  shannon: ['bc24ef7d-a89b-4789-bdce-21e0b3e20bba', 'bryce'],
  suzie: ['503f4a55-0773-461d-b46c-90e5cee9c7d4', 'megan'],
  martha: ['c01a541d-c585-435a-a2b9-5b0524eba790', 'megan'],
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(characters);
if (names.some(name => !characters[name])) throw new Error('Unknown character');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const vec = value => new Vector3(value.x, value.y, value.z);
const quat = value => new Quaternion(value.x, value.y, value.z, value.w);
const boneName = name => name.replace(/^mixamorig\d*:/, 'mixamorig:');

for (const name of names) {
  const [id, referenceName] = characters[name];
  const base = `https://www.mixamo.com/api/v1/characters/${id}/assets/rigged/`;
  const cache = path.resolve('.perf/mixamo', name);
  await fs.mkdir(cache, { recursive: true });
  async function get(file, json = false) {
    if (path.basename(file) !== file) throw new Error('Unexpected asset path');
    const local = path.join(cache, file);
    let bytes;
    try { bytes = await fs.readFile(local); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const response = await fetch(base + file, { headers: { 'X-Api-Key': 'mixamo2' } });
      if (!response.ok) throw new Error(`${name}/${file}: HTTP ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.subarray(0, 200).toString().includes('error_code')) throw new Error(bytes.toString());
      await fs.writeFile(local, bytes);
    }
    return json ? JSON.parse(bytes.toString()) : bytes;
  }
  const assets = await get('verold.json', true);
  const geometryAsset = assets.find(asset => asset.type === 'geometry');
  const geometry = await get(geometryAsset.resources.find(resource => resource.path.endsWith('.json')).path, true);
  const binary = await get(geometry.bufferPath);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(name);
  const accessor = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);

  // Viewer bones use identity axes; the existing FBX clips use Blender's bone axes.
  // Keep the reference skeleton's rotations, place its joints at the new bind positions,
  // and rebind the new meshes. Shared clips then work without runtime retargeting.
  const reference = await io.read(`public/models/people/${referenceName}.glb`);
  const referenceRoot = reference.getRoot().listScenes()[0].listChildren()[0];
  const rootRotation = new Quaternion().fromArray(referenceRoot.getRotation());
  const inverseRoot = rootRotation.clone().invert();
  const root = doc.createNode('Armature').setRotation(referenceRoot.getRotation()).setScale(referenceRoot.getScale());
  scene.addChild(root);
  const referenceBones = new Map(reference.getRoot().listNodes().filter(node => node.getName().startsWith('mixamorig:')).map(node => [node.getName(), node]));
  const previewNodes = new Map(assets.filter(asset => asset.type === 'node').map(asset => [asset.id, asset]));
  const positions = new Map();
  function placePreview(id, parentPosition = new Vector3(), parentRotation = new Quaternion()) {
    const node = previewNodes.get(id);
    if (!node) return;
    const position = vec(node.payload.position).applyQuaternion(parentRotation).add(parentPosition);
    const rotation = parentRotation.clone().multiply(quat(node.payload.orientation));
    positions.set(boneName(node.name), position);
    for (const child of node.children) placePreview(child, position, rotation);
  }
  const previewRoot = assets.find(asset => asset.name === 'RootNode');
  placePreview(previewRoot.id);
  const bones = new Map();
  const inverseBinds = new Map();
  function copyBone(referenceBone, parent, parentPosition, parentRotation) {
    const boneName = referenceBone.getName();
    const position = positions.get(boneName);
    if (!position) throw new Error(`${name}: missing ${boneName}`);
    const rotation = parentRotation.clone().multiply(new Quaternion().fromArray(referenceBone.getRotation()));
    const translation = position.clone().sub(parentPosition).applyQuaternion(parentRotation.clone().invert());
    const node = doc.createNode(boneName).setTranslation(translation.toArray()).setRotation(referenceBone.getRotation());
    parent.addChild(node);
    bones.set(boneName, node);
    inverseBinds.set(boneName, new Matrix4().compose(position.clone().applyQuaternion(inverseRoot), inverseRoot.clone().multiply(rotation), new Vector3(1, 1, 1)).invert().toArray());
    for (const child of referenceBone.listChildren()) if (referenceBones.has(child.getName())) copyBone(child, node, position, rotation);
  }
  copyBone(referenceBones.get('mixamorig:Hips'), root, new Vector3(), rootRotation);

  const textures = new Map();
  const materials = new Map();
  for (const asset of assets.filter(asset => asset.type === 'material')) {
    const textureId = asset.payload.diffuseTexture;
    if (!textures.has(textureId)) {
      const textureAsset = assets.find(item => item.id === textureId);
      const resource = textureAsset.resources.find(item => item.path.includes('-low.')) ?? textureAsset.resources[0];
      textures.set(textureId, doc.createTexture(textureAsset.name).setImage(await get(resource.path)).setMimeType(resource.contentType));
    }
    const material = doc.createMaterial(asset.name).setBaseColorTexture(textures.get(textureId)).setRoughnessFactor(0.72).setMetallicFactor(0);
    if (/hair/i.test(asset.name)) material.setDoubleSided(true);
    materials.set(asset.id, material);
  }

  const floatAttribute = spec => {
    const array = new Float32Array(spec.count * spec.value_size);
    for (let i = 0; i < array.length; i++) array[i] = binary.readFloatLE(spec.fileOffset + i * 4);
    return array;
  };
  for (const asset of assets.filter(asset => asset.type === 'skinned_mesh' && !/eyelash/i.test(asset.name))) {
    const spec = geometry[asset.payload.geometryName];
    const attributes = spec.vertex_attributes;
    const positionsArray = floatAttribute(attributes.positions);
    const normals = floatAttribute(attributes.normals);
    for (const values of [positionsArray, normals]) {
      for (let i = 0; i < values.length; i += 3) {
        const v = new Vector3().fromArray(values, i).applyQuaternion(inverseRoot);
        v.toArray(values, i);
      }
    }
    const indices = new Uint32Array(spec.indices.count);
    const bytesPerIndex = spec.indices.size_uncompressed / spec.indices.count;
    if (![2, 4].includes(bytesPerIndex)) throw new Error('Unsupported index format');
    for (const offset of spec.offsets) for (let i = offset.start; i < offset.start + offset.count; i++) {
      indices[i] = (bytesPerIndex === 2 ? binary.readUInt16LE(spec.indices.fileOffset + i * 2) : binary.readUInt32LE(spec.indices.fileOffset + i * 4)) + offset.index;
      if (indices[i] >= attributes.positions.count) throw new Error(`${name}: invalid vertex index`);
    }
    const weights = floatAttribute(attributes.skin_weights);
    const joints = Uint16Array.from(floatAttribute(attributes.skin_indices));
    const uv = floatAttribute(attributes.uvs1);
    // Mixamo's viewer uses bottom-left UVs; glTF textures use top-left UVs.
    for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];
    for (let i = 0; i < weights.length; i += 4) {
      const total = weights[i] + weights[i + 1] + weights[i + 2] + weights[i + 3];
      if (!(total > 0)) throw new Error(`${name}: unweighted vertex`);
      for (let j = 0; j < 4; j++) {
        weights[i + j] /= total;
        if (joints[i + j] >= spec.bones.length) throw new Error(`${name}: invalid joint index`);
      }
    }
    const primitive = doc.createPrimitive().setIndices(accessor('SCALAR', indices))
      .setAttribute('POSITION', accessor('VEC3', positionsArray)).setAttribute('NORMAL', accessor('VEC3', normals))
      .setAttribute('TEXCOORD_0', accessor('VEC2', uv))
      .setAttribute('JOINTS_0', accessor('VEC4', joints)).setAttribute('WEIGHTS_0', accessor('VEC4', weights))
      .setMaterial(materials.get(asset.payload.material));
    const skin = doc.createSkin(asset.name).setSkeleton(bones.get('mixamorig:Hips'));
    const matrices = [];
    for (const originalName of spec.bones) {
      const normalized = boneName(originalName);
      if (!bones.has(normalized)) throw new Error(`${name}: missing skin joint ${normalized}`);
      skin.addJoint(bones.get(normalized));
      matrices.push(...inverseBinds.get(normalized));
    }
    skin.setInverseBindMatrices(accessor('MAT4', new Float32Array(matrices)));
    root.addChild(doc.createNode(asset.name).setMesh(doc.createMesh(asset.name).addPrimitive(primitive)).setSkin(skin));
  }
  await io.write(path.join(cache, `${name}.glb`), doc);
  console.log(`${name}: ${doc.getRoot().listMeshes().length} meshes, ${bones.size} bones -> ${cache}/${name}.glb`);
}
