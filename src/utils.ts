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
