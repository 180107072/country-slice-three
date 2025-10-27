import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/Addons.js";

export interface Brick {
  rowCount: number;
  rowIdBottom: number;
  rowIdTop: number;
  boundsUv: THREE.Vector2;
  pivotUv: THREE.Vector2;
  scale: THREE.Vector3;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

export class InstancedWall {
  private mesh: THREE.InstancedMesh<
    THREE.BoxGeometry,
    THREE.MeshStandardMaterial
  > | null = null;
  private capacity = 0;
  private readonly geometry = new RoundedBoxGeometry(1, 1, 1);
  private readonly material = new THREE.MeshStandardMaterial({
    color: 0xd3b08c,
    roughness: 0.85,
    metalness: 0.05,
  });
  private readonly dummy = new THREE.Object3D();

  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  update(bricks: Brick[]) {
    if (!this.mesh || bricks.length > this.capacity) {
      if (this.mesh) {
        this.scene.remove(this.mesh);
        this.mesh.dispose();
      }
      this.capacity = Math.max(bricks.length, 1);
      this.mesh = new THREE.InstancedMesh(
        this.geometry,
        this.material,
        this.capacity,
      );
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(this.mesh);
    }

    if (!this.mesh) return;

    const count = bricks.length;
    for (let i = 0; i < count; i++) {
      const brick = bricks[i];
      this.dummy.position.copy(brick.position);
      this.dummy.quaternion.copy(brick.quaternion);
      this.dummy.scale.copy(brick.scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(scene: THREE.Scene) {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = null;
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}
