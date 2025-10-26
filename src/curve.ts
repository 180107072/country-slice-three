import * as THREE from "three";

export class Curve {
  readonly points: THREE.Vector3[];
  readonly pointsU: number[];
  readonly length: number;

  private constructor(
    points: THREE.Vector3[],
    pointsU: number[],
    length: number
  ) {
    this.points = points;
    this.pointsU = pointsU;
    this.length = length;
  }

  static from(pointsIn: THREE.Vector3[]) {
    if (pointsIn.length < 2) {
      throw new Error("Curve requires at least two points");
    }
    const points = pointsIn.map((p) => p.clone());
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
      length += points[i + 1].distanceTo(points[i]);
    }

    const uValues: number[] = [];
    let traveled = 0;
    for (let i = 0; i < points.length; i++) {
      uValues.push(length === 0 ? 0 : traveled / length);
      if (i < points.length - 1) {
        traveled += points[i + 1].distanceTo(points[i]);
      }
    }

    return new Curve(points, uValues, Math.max(length, Number.EPSILON));
  }

  getPosAtU(u: number) {
    const [start, end] = this.segmentFromU(u);
    const segRange = this.pointsU[end] - this.pointsU[start];
    const local = segRange === 0 ? 0 : (u - this.pointsU[start]) / segRange;
    return this.points[start]
      .clone()
      .lerp(this.points[end], THREE.MathUtils.clamp(local, 0, 1));
  }

  getTangentAtU(u: number) {
    const [start, end] = this.segmentFromU(u);
    return this.points[end].clone().sub(this.points[start]).normalize();
  }

  private segmentFromU(u: number): [number, number] {
    if (u <= 0) {
      return [0, 1];
    }
    if (u >= 1) {
      return [this.points.length - 2, this.points.length - 1];
    }
    for (let i = 0; i < this.pointsU.length; i++) {
      if (u <= this.pointsU[i]) {
        return [Math.max(i - 1, 0), i];
      }
    }
    return [this.points.length - 2, this.points.length - 1];
  }
}
