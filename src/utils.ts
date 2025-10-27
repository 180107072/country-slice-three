import * as THREE from "three";

export function smoothPoints(points: THREE.Vector3[], smoothingSteps: number) {
  if (points.length < 3) {
    return points.map((p) => p.clone());
  }
  let smoothed = points.map((p) => p.clone());
  for (let step = 0; step < smoothingSteps; step++) {
    const current = smoothed.map((p) => p.clone());
    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const next = smoothed[i + 1];
      const avg = prev.clone().add(next).multiplyScalar(0.5);
      current[i].add(avg.sub(current[i]).multiplyScalar(0.5));
    }
    smoothed = current;
  }
  return smoothed;
}

export interface CircleSnapResult {
  points: THREE.Vector3[];
  center: THREE.Vector3;
  radius: number;
}

export interface SquareSnapResult {
  points: THREE.Vector3[];
  center: THREE.Vector3;
  halfWidth: number;
  halfDepth: number;
}

export function snapPointsToCircle(
  points: THREE.Vector3[],
): CircleSnapResult | null {
  if (points.length < 6) {
    return null;
  }
  const start = points[0];
  const end = points[points.length - 1];
  if (start.distanceTo(end) > 0.35) {
    return null;
  }

  const min = new THREE.Vector3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
  const max = new THREE.Vector3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  );
  const center = new THREE.Vector3();
  points.forEach((p) => {
    center.add(p);
    min.min(p);
    max.max(p);
  });
  center.multiplyScalar(1 / points.length);

  const extentX = max.x - min.x;
  const extentZ = max.z - min.z;
  const largestExtent = Math.max(extentX, extentZ, 0.0001);
  const extentDiff = Math.abs(extentX - extentZ) / largestExtent;
  if (extentDiff > 0.25) {
    return null;
  }

  const radii = points.map((p) => {
    const dx = p.x - center.x;
    const dz = p.z - center.z;
    return Math.sqrt(dx * dx + dz * dz);
  });
  const averageRadius =
    radii.reduce((sum, r) => sum + r, 0) / Math.max(radii.length, 1);
  if (averageRadius < 0.25) {
    return null;
  }
  const variance =
    radii.reduce(
      (sum, r) => sum + (r - averageRadius) * (r - averageRadius),
      0,
    ) / Math.max(radii.length, 1);
  const normalizedDeviation = Math.sqrt(variance) / averageRadius;
  if (normalizedDeviation > 0.2) {
    return null;
  }

  const avgY =
    points.reduce((sum, p) => sum + p.y, 0) / Math.max(points.length, 1);
  const segments = Math.max(32, Math.round(averageRadius * 24));
  const circlePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    circlePoints.push(
      new THREE.Vector3(
        center.x + Math.cos(angle) * averageRadius,
        avgY,
        center.z + Math.sin(angle) * averageRadius,
      ),
    );
  }
  return {
    points: circlePoints,
    center,
    radius: averageRadius,
  };
}

const SQUARE_SIDE_SEGMENTS = 12;

export function snapPointsToSquare(
  points: THREE.Vector3[],
): SquareSnapResult | null {
  if (points.length < 6) {
    return null;
  }
  const start = points[0];
  const end = points[points.length - 1];
  if (start.distanceTo(end) > 0.35) {
    return null;
  }

  const min = new THREE.Vector3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  );
  const max = new THREE.Vector3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  );
  const center = new THREE.Vector3();
  points.forEach((p) => {
    center.add(p);
    min.min(p);
    max.max(p);
  });
  center.multiplyScalar(1 / points.length);

  const width = max.x - min.x;
  const depth = max.z - min.z;
  const largest = Math.max(width, depth);
  if (largest < 0.35) {
    return null;
  }
  const aspectDiff = Math.abs(width - depth) / Math.max(largest, 0.0001);
  if (aspectDiff > 0.2) {
    return null;
  }

  // Ensure the stroke roughly visits each cardinal direction
  const quadrantsHit = [false, false, false, false];
  points.forEach((p) => {
    const dx = p.x - center.x;
    const dz = p.z - center.z;
    const angle = Math.atan2(dz, dx);
    const quadrant = Math.floor(((angle + Math.PI) / (Math.PI / 2)) % 4);
    quadrantsHit[Math.max(0, Math.min(3, quadrant))] = true;
  });
  if (!quadrantsHit.every(Boolean)) {
    return null;
  }

  const halfExtent = largest / 2;
  const avgY =
    points.reduce((sum, p) => sum + p.y, 0) / Math.max(points.length, 1);
  const corners = [
    new THREE.Vector3(-halfExtent, 0, -halfExtent),
    new THREE.Vector3(halfExtent, 0, -halfExtent),
    new THREE.Vector3(halfExtent, 0, halfExtent),
    new THREE.Vector3(-halfExtent, 0, halfExtent),
  ];
  const baseCenter = new THREE.Vector3(center.x, avgY, center.z);

  const squarePoints: THREE.Vector3[] = [];
  for (let side = 0; side < 4; side++) {
    const startCorner = corners[side];
    const endCorner = corners[(side + 1) % 4];
    for (let i = 0; i < SQUARE_SIDE_SEGMENTS; i++) {
      const t = i / SQUARE_SIDE_SEGMENTS;
      squarePoints.push(
        new THREE.Vector3()
          .copy(startCorner)
          .lerp(endCorner, t)
          .add(baseCenter),
      );
    }
  }
  squarePoints.push(squarePoints[0].clone());

  return {
    points: squarePoints,
    center,
    halfWidth: halfExtent,
    halfDepth: halfExtent,
  };
}
