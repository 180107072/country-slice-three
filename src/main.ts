import "./style.css";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";
import { CurveManager } from "./curve-manager";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app container is missing");
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
app.appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150);
camera.position.set(-4, 5.5, 6);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 2.4;
controls.maxDistance = 16;
controls.enablePan = true;
controls.enableRotate = false;

const hemi = new THREE.HemisphereLight(0xeed9c4, 0x0a111c, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(4, 8, 4);
scene.add(dir);

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b2735,
  roughness: 0.92,
  metalness: 0.05,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

const preview = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 0.04, 0.18),
  new THREE.MeshStandardMaterial({
    color: 0x7bf2d1,
    emissive: 0x0d1d1a,
    transparent: true,
    opacity: 0.85,
  })
);
preview.visible = false;
scene.add(preview);

const curveManager = new CurveManager(scene);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();
let lastHoverPoint: THREE.Vector3 | null = null;
let activeCurveIndex: number | null = null;
let isDrawing = false;

function resizeRenderer() {
  const { clientWidth, clientHeight } = app!;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

resizeRenderer();
window.addEventListener("resize", resizeRenderer);

function normalizePointer(event: PointerEvent) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function projectOnGround(event: PointerEvent): THREE.Vector3 | null {
  normalizePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const intersection = raycaster.ray.intersectPlane(groundPlane, hitPoint);
  if (!intersection) {
    return null;
  }
  return intersection.clone();
}

function onPointerDown(event: PointerEvent) {
  const point = projectOnGround(event);
  if (!point) {
    return;
  }
  if (event.button !== 0) {
    return;
  }

  isDrawing = true;
  activeCurveIndex = curveManager.startCurve();
  curveManager.addPoint(activeCurveIndex, point);
  preview.position.copy(point);
  preview.visible = true;
}

function onPointerMove(event: PointerEvent) {
  const point = projectOnGround(event);
  lastHoverPoint = point;
  if (point) {
    preview.visible = true;
    preview.position.copy(point);
  } else {
    preview.visible = false;
  }

  if (isDrawing && activeCurveIndex !== null && point) {
    curveManager.addPoint(activeCurveIndex, point);
  }
}

function stopDrawing() {
  isDrawing = false;
  activeCurveIndex = null;
}

renderer.domElement.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", stopDrawing);
window.addEventListener("pointerleave", stopDrawing);
window.addEventListener("blur", stopDrawing);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  curveManager.tick();

  if (!isDrawing && lastHoverPoint) {
    preview.position.copy(lastHoverPoint);
    preview.visible = true;
  }

  renderer.render(scene, camera);
}

animate();
