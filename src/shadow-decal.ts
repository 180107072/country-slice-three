import * as THREE from "three";
import type { Curve } from "./curve";

const UP = new THREE.Vector3(0, 1, 0);
const SHADOW_WIDTH = 0.3;
const SHADOW_OFFSET = 0.001;
const SHADOW_CAP_SEGMENTS = 10;

function addShadowCap(
  center: THREE.Vector3,
  offset: THREE.Vector3,
  neighbor: THREE.Vector3,
  positions: number[],
  uvs: number[],
  indices: number[],
  forward: boolean
) {
  const tangent = neighbor.clone().sub(center).normalize();
  const dir = forward ? tangent : tangent.clone().negate();
  const rotationAxis = forward ? -Math.PI : Math.PI;
  const startIndex = positions.length / 3;

  positions.push(center.x, center.y + SHADOW_OFFSET, center.z);
  uvs.push(0, 0);

  for (let i = 0; i < SHADOW_CAP_SEGMENTS; i++) {
    const t = i / (SHADOW_CAP_SEGMENTS - 1);
    const angle = rotationAxis * t;
    const rot = new THREE.Quaternion().setFromAxisAngle(UP, angle);
    const point = center.clone().add(offset.clone().applyQuaternion(rot));
    positions.push(point.x, point.y + SHADOW_OFFSET, point.z);
    uvs.push(t, 1);

    if (i < SHADOW_CAP_SEGMENTS - 1) {
      indices.push(startIndex, startIndex + i + 1, startIndex + i + 2);
    }
  }
}

function buildShadowGeometry(points: THREE.Vector3[]) {
  if (points.length < 2) {
    return new THREE.BufferGeometry();
  }

  const offsets = points.map((point, index) => {
    const prev = points[index - 1] ?? point;
    const next = points[index + 1] ?? point;
    const tangent = next.clone().sub(prev).normalize();
    return tangent.clone().cross(UP).setLength(SHADOW_WIDTH);
  });

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const leftStart = start.clone().sub(offsets[i]);
    const leftEnd = end.clone().sub(offsets[i + 1]);
    const rightStart = start.clone().add(offsets[i]);
    const rightEnd = end.clone().add(offsets[i + 1]);

    const base = positions.length / 3;
    const segmentPositions = [
      start.x,
      start.y + SHADOW_OFFSET,
      start.z,
      end.x,
      end.y + SHADOW_OFFSET,
      end.z,
      leftStart.x,
      leftStart.y + SHADOW_OFFSET,
      leftStart.z,
      leftEnd.x,
      leftEnd.y + SHADOW_OFFSET,
      leftEnd.z,
      rightStart.x,
      rightStart.y + SHADOW_OFFSET,
      rightStart.z,
      rightEnd.x,
      rightEnd.y + SHADOW_OFFSET,
      rightEnd.z,
    ];
    positions.push(...segmentPositions);

    uvs.push(0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1);

    indices.push(
      base,
      base + 1,
      base + 2,
      base + 1,
      base + 3,
      base + 2,
      base,
      base + 4,
      base + 1,
      base + 4,
      base + 5,
      base + 1
    );
  }

  addShadowCap(points[0], offsets[0], points[1], positions, uvs, indices, true);
  addShadowCap(
    points[points.length - 1],
    offsets[offsets.length - 1],
    points[points.length - 2],
    positions,
    uvs,
    indices,
    false
  );

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class ShadowDecal {
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.scene.add(this.mesh);
  }

  update(curve: Curve) {
    const geometry = buildShadowGeometry(curve.points);
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
