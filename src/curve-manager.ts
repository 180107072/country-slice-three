import * as THREE from "three";
import { InstancedWall } from "./instanced-wall";
import { Curve } from "./curve";
import { WallConstructor } from "./wall-constructor";
import { smoothPoints, snapPointsToCircle } from "./utils";

interface UserCurve {
  points: THREE.Vector3[];
}

export class CurveManager {
  private userCurves: UserCurve[] = [];
  private instancedWalls: Array<InstancedWall | null> = [];
  private dirty = new Set<number>();
  readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  startCurve() {
    const curve: UserCurve = { points: [] };
    this.userCurves.push(curve);
    this.instancedWalls.push(null);
    const idx = this.userCurves.length - 1;
    this.dirty.add(idx);
    return idx;
  }

  addPoint(index: number, point: THREE.Vector3, minDistance = 0.025) {
    const curve = this.userCurves[index];
    if (!curve) return;
    const last = curve.points[curve.points.length - 1];
    if (!last || last.distanceTo(point) > minDistance) {
      curve.points.push(point.clone());
      this.dirty.add(index);
    }
  }

  tick() {
    if (this.dirty.size === 0) return;
    this.dirty.forEach((index) => {
      const curve = this.userCurves[index];
      if (!curve || curve.points.length < 2) {
        return;
      }
      const smoothed = smoothPoints(curve.points, 40);
      const snappedCircle = snapPointsToCircle(smoothed);
      if (snappedCircle) {
        const center = snappedCircle.center.clone();
        center.y = WallConstructor.WALL_HEIGHT;
      }
      const finalPoints = snappedCircle?.points ?? smoothed;
      const bevyLikeCurve = Curve.from(finalPoints);

      const bricks = WallConstructor.fromCurve(
        bevyLikeCurve,
        snappedCircle ? 0 : undefined,
      );

      if (!this.instancedWalls[index]) {
        this.instancedWalls[index] = new InstancedWall(this.scene);
      }
      this.instancedWalls[index]?.update(bricks);
    });
    this.dirty.clear();
  }

  clear() {
    this.instancedWalls.forEach((wall) => wall?.dispose(this.scene));
    this.userCurves = [];
    this.instancedWalls = [];
    this.dirty.clear();
  }
}
