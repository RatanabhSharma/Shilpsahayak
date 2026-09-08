import * as THREE from 'three';
import { ParsedGeometry, PreviewObject, ParsedModelResult } from './modelTypes';

export interface SceneBuildOptions {
  colorMode?: 'original' | 'single';
  singleColorHex?: string;
  wireframe?: boolean;
}

/**
 * Cache for reusable BufferGeometries keyed by object ID to ensure
 * switching plates reuses memory without re-allocating or re-parsing.
 */
class GeometryCache {
  private cache = new Map<string, THREE.BufferGeometry>();

  getOrCreate(obj: PreviewObject): THREE.BufferGeometry {
    const existing = this.cache.get(obj.id);
    if (existing) return existing;

    const geom = buildThreeGeometry(obj.geometry);
    this.cache.set(obj.id, geom);
    return geom;
  }

  clear(): void {
    this.cache.forEach((geom) => geom.dispose());
    this.cache.clear();
  }
}

export const globalGeometryCache = new GeometryCache();

/**
 * Converts a pure ParsedGeometry data buffer into a Three.js BufferGeometry.
 * Computes bounding box once on creation for fast raycasting and transform queries.
 */
export function buildThreeGeometry(parsed: ParsedGeometry): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  if (parsed.position && parsed.position.length > 0) {
    geom.setAttribute('position', new THREE.BufferAttribute(parsed.position, 3));
  }

  if (parsed.normal && parsed.normal.length > 0) {
    geom.setAttribute('normal', new THREE.BufferAttribute(parsed.normal, 3));
  } else if (parsed.position && parsed.position.length > 0) {
    geom.computeVertexNormals();
  }

  if (parsed.color && parsed.color.length > 0) {
    geom.setAttribute('color', new THREE.BufferAttribute(parsed.color, 3));
  }

  if (parsed.uv && parsed.uv.length > 0) {
    geom.setAttribute('uv', new THREE.BufferAttribute(parsed.uv, 2));
  }

  if (parsed.index && parsed.index.length > 0) {
    geom.setIndex(new THREE.BufferAttribute(parsed.index, 1));
  }

  geom.computeBoundingBox();
  return geom;
}

/**
 * Extracts raw Float32Array and index buffers from a THREE.BufferGeometry
 * into a pure, decoupled ParsedGeometry representation.
 */
export function bufferGeometryToParsedGeometry(geom: THREE.BufferGeometry): ParsedGeometry {
  const posAttr = geom.attributes.position;
  const position = posAttr ? new Float32Array(posAttr.array) : new Float32Array(0);

  const normAttr = geom.attributes.normal;
  const normal = normAttr ? new Float32Array(normAttr.array) : undefined;

  const colAttr = geom.attributes.color;
  const color = colAttr ? new Float32Array(colAttr.array) : undefined;

  const uvAttr = geom.attributes.uv;
  const uv = uvAttr ? new Float32Array(uvAttr.array) : undefined;

  let index: Uint32Array | Uint16Array | undefined;
  if (geom.index) {
    index =
      geom.index.array instanceof Uint32Array || geom.index.array instanceof Uint16Array
        ? geom.index.array
        : new Uint32Array(geom.index.array);
  }

  return { position, normal, color, uv, index };
}

/**
 * Converts an optional 12- or 16-element transform array into a THREE.Matrix4.
 */
export function matrixFromTransformArray(transform?: number[]): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  if (!transform || transform.length === 0) return m;

  if (transform.length === 16) {
    m.fromArray(transform);
  } else if (transform.length === 12) {
    // 3MF affine 12-element: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
    m.set(
      transform[0], transform[3], transform[6], transform[9],
      transform[1], transform[4], transform[7], transform[10],
      transform[2], transform[5], transform[8], transform[11],
      0, 0, 0, 1
    );
  }
  return m;
}

/**
 * Creates a mesh from a PreviewObject, applying its transform and materials.
 */
export function buildMeshForObject(
  obj: PreviewObject,
  options?: SceneBuildOptions
): THREE.Mesh {
  const geom = globalGeometryCache.getOrCreate(obj);

  const isOriginalMode = options?.colorMode !== 'single';
  let mat: THREE.Material;

  if (isOriginalMode && obj.originalMaterial) {
    if (Array.isArray(obj.originalMaterial)) {
      mat = obj.originalMaterial[0].clone();
    } else {
      mat = obj.originalMaterial.clone();
    }
    if ('wireframe' in mat) {
      (mat as any).wireframe = !!options?.wireframe;
    }
  } else {
    const hasVertexColors = !!obj.geometry.color && obj.geometry.color.length > 0;
    const hexColor = isOriginalMode ? (obj.color || '#94A3B8') : (options?.singleColorHex || '#2563EB');

    mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      vertexColors: hasVertexColors && isOriginalMode,
      roughness: 0.38,
      metalness: 0.05,
      wireframe: !!options?.wireframe,
      side: THREE.DoubleSide,
    });
  }

  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = obj.name || obj.id;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (obj.transform) {
    const matrix = matrixFromTransformArray(obj.transform);
    mesh.applyMatrix4(matrix);
  }

  return mesh;
}

/**
 * Builds a THREE.Group containing only the objects assigned to a specific build plate.
 */
export function buildSceneForPlate(
  model: ParsedModelResult,
  plateId: string,
  options?: SceneBuildOptions
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Plate_${plateId}`;

  const plate = model.plates?.find((p) => p.id === plateId);
  if (!plate) {
    return group;
  }

  const plateObjIdSet = new Set(plate.objectIds);
  const plateObjects = model.objects.filter((obj) => plateObjIdSet.has(obj.id));

  for (const obj of plateObjects) {
    const mesh = buildMeshForObject(obj, options);
    group.add(mesh);
  }

  return group;
}

/**
 * Builds a THREE.Group containing all objects in the model (for single_model or multi_object modes).
 */
export function buildSceneForModel(
  model: ParsedModelResult,
  options?: SceneBuildOptions
): THREE.Group {
  const group = new THREE.Group();
  group.name = model.fileName;

  for (const obj of model.objects) {
    const mesh = buildMeshForObject(obj, options);
    group.add(mesh);
  }

  return group;
}
