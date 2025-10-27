import * as THREE from "three";

import { Curve } from "./curve";
import type { Brick } from "./instanced-wall";

const UP = new THREE.Vector3(0, 1, 0);

class RNG {
  private state: number;
  constructor(seed = 1) {
    this.state = seed >>> 0;
  }
  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }
}

function randomSplits(splits: number, variance: number, rng: RNG) {
  const out: number[] = [];
  for (let i = 0; i <= splits; i++) {
    const base = splits === 0 ? 0 : i / splits;
    if (i === 0 || i === splits) {
      out.push(base);
    } else {
      out.push(base + (rng.next() - 0.5) * variance);
    }
  }
  return out;
}

export class WallConstructor {
  static readonly BRICK_WIDTH = 0.2;
  static readonly BRICK_WIDTH_VARIANCE = 0.14;
  static readonly BRICK_HEIGHT = 0.2;
  static readonly BRICK_HEIGHT_VARIANCE = 0.09;
  static readonly BRICK_DEPTH = 0.2;
  static readonly BRICK_DEPTH_VARIANCE = 0.05;
  static readonly WALL_HEIGHT = 1.4;

  static fromCurve(curveIn: Curve, gapProbability = 0.35): Brick[] {
    const startExtension = curveIn
      .getPosAtU(0)
      .sub(curveIn.getTangentAtU(0).multiplyScalar(0.1));
    const endExtension = curveIn
      .getPosAtU(1)
      .add(curveIn.getTangentAtU(1).multiplyScalar(0.1));
    const extendedPoints = [
      startExtension,
      ...curveIn.points.map((p) => p.clone()),
      endExtension,
    ];
    const curve = Curve.from(extendedPoints);

    const rng = new RNG(0);
    const wallLength = curve.length;
    const rowCount = Math.max(
      1,
      Math.floor(WallConstructor.WALL_HEIGHT / WallConstructor.BRICK_HEIGHT),
    );
    const rows = randomSplits(
      rowCount,
      WallConstructor.BRICK_HEIGHT_VARIANCE / WallConstructor.WALL_HEIGHT,
      rng,
    );
    const bricksPerRow = Math.max(
      2,
      Math.floor(wallLength / WallConstructor.BRICK_WIDTH),
    );

    const bricks: Brick[] = [];
    rows.forEach((rowU, rowIndex) => {
      const nextRowU = rows[rowIndex + 1];
      const brickHeight = nextRowU
        ? (nextRowU - rowU) * WallConstructor.WALL_HEIGHT
        : WallConstructor.BRICK_HEIGHT +
          (rng.next() - 0.5) * WallConstructor.BRICK_HEIGHT_VARIANCE;
      const totalRowHeight = brickHeight / WallConstructor.WALL_HEIGHT;

      const brickWidthSegments = randomSplits(
        bricksPerRow,
        WallConstructor.BRICK_WIDTH_VARIANCE / Math.max(wallLength, 0.0001),
        rng,
      );

      const rowBricks: Brick[] = [];
      for (let i = 0; i < brickWidthSegments.length - 1; i++) {
        if (rowIndex === rows.length - 1 && rng.next() < gapProbability) {
          continue;
        }

        const thisU = brickWidthSegments[i];
        const nextU = brickWidthSegments[i + 1];
        const widthU = nextU - thisU;
        const widthWorld = widthU * wallLength;
        const pivotU = (nextU + thisU) * 0.5;
        const brickDepth =
          WallConstructor.BRICK_DEPTH +
          (rng.next() - 0.5) * WallConstructor.BRICK_DEPTH_VARIANCE;

        const createBrick = (
          heightRatio: number,
          pivotV: number,
          rowBottom: number,
          rowTop: number,
        ) => {
          rowBricks.push({
            rowCount: rowCount * 2,
            rowIdBottom: rowBottom,
            rowIdTop: rowTop,
            pivotUv: new THREE.Vector2(pivotU, pivotV),
            boundsUv: new THREE.Vector2(widthU, heightRatio),
            scale: new THREE.Vector3(
              widthWorld,
              heightRatio * WallConstructor.WALL_HEIGHT,
              brickDepth,
            ),
            position: new THREE.Vector3(pivotU * wallLength, 0, 0),
            quaternion: new THREE.Quaternion(),
          });
        };

        if (rng.next() < 0.4 && rowIndex !== rows.length - 1) {
          const split = THREE.MathUtils.lerp(0.3, 0.7, rng.next());
          const topHeight = totalRowHeight * split;
          const bottomHeight = totalRowHeight - topHeight;
          const pivotV1 = rowU + topHeight / 2;
          const pivotV2 = rowU + totalRowHeight - bottomHeight / 2;
          createBrick(topHeight, pivotV1, rowIndex * 2, rowIndex * 2 + 1);
          createBrick(
            bottomHeight,
            pivotV2,
            rowIndex * 2 + 1,
            rowIndex * 2 + 2,
          );
        } else {
          const pivotV = rowU + totalRowHeight / 2;
          createBrick(totalRowHeight, pivotV, rowIndex * 2, rowIndex * 2 + 2);
        }
      }

      rowBricks.forEach((brick) => {
        const worldPos = curve.getPosAtU(brick.pivotUv.x);
        const tangent = curve.getTangentAtU(brick.pivotUv.x).normalize();
        const normal = tangent.clone().cross(UP).normalize();
        brick.position.copy(worldPos);
        brick.position.y = brick.pivotUv.y * WallConstructor.WALL_HEIGHT;
        const matrix = new THREE.Matrix4().makeBasis(tangent, UP, normal);
        brick.quaternion.setFromRotationMatrix(matrix);
      });

      bricks.push(...rowBricks);
    });

    return bricks;
  }
}
