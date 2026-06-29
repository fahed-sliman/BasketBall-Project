import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SimParams, TrajectoryPoint } from './types';
import { createCourt } from './scene/court';
import { createBallMesh, updateBallRotation } from './scene/ball';
import { createHoopAssembly } from './scene/hoop';
import { TrajectoryTrail } from './scene/trail';
import { computeFullTrajectory, analyzeTrajectory } from './physics/rk4';
import { initControlPanel, updateTelemetryDisplay } from './ui/panel';
import { loadPlayer, triggerThrowAnim, updateThrowAnim } from './scene/player';
import { createWindParticles, updateWindParticles } from './scene/wind';

const params: SimParams = {
  v0: 7.5, theta: 52, phi: 0, omega: 20,
  spinType: 'Backspin', venue: 'Indoor',
  windX: 0, spinDecay: 0.1, windY: 0, windZ: 0,
  mass: 0.625, cd: 0.5, restitution: 0.5,
  x_hoop: 4.6, playbackSpeed: 1
};

let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
let ball: THREE.Mesh, trail: TrajectoryTrail;
let points: TrajectoryPoint[] = [];
let currentIndex = 0, isPlaying = false, clock = new THREE.Clock();
let activeHoopX = params.x_hoop;

function init() {
  const viewport = document.getElementById('canvas-container')!;

  // ── Scene ──────────────────────────────────────────────────────────────
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  // ── Camera ─────────────────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(45, viewport.clientWidth / viewport.clientHeight, 0.1, 100);
  camera.position.set(8, 5, 10);

  // ── Renderer ───────────────────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.appendChild(renderer.domElement);

  // ── Controls ───────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(4, 3, 0);
  controls.update();

  // ── Scene Objects ──────────────────────────────────────────────────────
  scene.add(createCourt());
  ball = createBallMesh();
  scene.add(ball);
  scene.add(createHoopAssembly(params.x_hoop));
  trail = new TrajectoryTrail(scene);

  // ── Lighting ───────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(5, 15, 5);
  sun.castShadow = true;
  scene.add(sun);

  // ── Wind Particles — after scene is ready ──────────────────────────────
  createWindParticles(scene);

  // ── Player Model — async, after scene is ready ─────────────────────────
  loadPlayer(scene).catch(err => console.warn('Player model failed to load:', err));

  // ── Resize ─────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  });
}

function launch() {
  if (isPlaying) return;

  if (activeHoopX !== params.x_hoop) {
    const currentHoop = scene.getObjectByName('hoopAssembly');
    if (currentHoop) scene.remove(currentHoop);
    scene.add(createHoopAssembly(params.x_hoop));
    activeHoopX = params.x_hoop;
  }

  points = computeFullTrajectory(params);
  trail.clear();
  currentIndex = 0;
  isPlaying = true;
  clock.getDelta(); // flush accumulated delta

  triggerThrowAnim(); // ← trigger player animation
}

function reset() {
  isPlaying = false;
  currentIndex = 0;
  trail.clear();
  ball.position.set(0, 2.0, 0);
  ball.rotation.set(0, 0, 0);
  updateTelemetryDisplay(0, 2.0, 0, 0, 0, params.omega);
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getDelta();
  const dt = elapsed > 0 ? elapsed : 0.016; // fallback 60fps

  // ── Wind always updates (even when not playing) ────────────────────────
  updateWindParticles(params.windX, params.windY, params.windZ, dt);

  // ── Player throw animation always updates ──────────────────────────────
  updateThrowAnim(dt);

  // ── Ball playback ──────────────────────────────────────────────────────
  if (isPlaying && points.length > 0) {
    const scaledElapsed = elapsed * params.playbackSpeed;
    if (scaledElapsed <= 0) {
      renderer.render(scene, camera);
      return;
    }

    const steps = Math.max(1, Math.floor(scaledElapsed / 0.005));
    currentIndex += steps;

    if (currentIndex >= points.length) {
      currentIndex = points.length - 1;
      isPlaying = false;
      showResultsOverlay();
    }

    const data = points[currentIndex];
    ball.position.set(data.x, data.y, data.z);
    updateBallRotation(ball, data.omega, data.vx, data.vz, 0.005 * steps);
    trail.addPoint(data.x, data.y, data.z);

    const speedTotal = Math.sqrt(data.vx**2 + data.vy**2 + data.vz**2);
    updateTelemetryDisplay(data.x, data.y, data.z, speedTotal, data.vy, data.omega);
  }

  renderer.render(scene, camera);
}

function showResultsOverlay() {
  const summary = analyzeTrajectory(points, params);

  document.getElementById('an-height')!.innerText  = `${summary.maxHeight.toFixed(2)} m`;
  document.getElementById('an-range')!.innerText   = `${summary.range.toFixed(2)} m`;
  document.getElementById('an-time')!.innerText    = `${summary.flightTime.toFixed(2)} s`;
  document.getElementById('an-angle')!.innerText   = `${summary.entryAngle.toFixed(1)}°`;
  document.getElementById('an-impulse')!.innerText = `${summary.maxCollisionImpulse.toFixed(1)} N`;
  document.getElementById('an-status')!.innerText  = summary.scored ? 'SCORED ✅' : 'MISSED ❌';

  const banner = document.getElementById('flash-banner')!;
  const txt    = document.getElementById('flash-text')!;

  if (summary.scored) {
    txt.innerText  = 'SCORED! 🏀';
    banner.className = 'fixed inset-0 flex items-center justify-center bg-green-950/90 backdrop-blur transition-all duration-300 z-50 opacity-100';
  } else {
    txt.innerText  = 'MISSED ❌';
    banner.className = 'fixed inset-0 flex items-center justify-center bg-red-950/90 backdrop-blur transition-all duration-300 z-50 opacity-100';
  }

  setTimeout(() => {
    banner.className = 'fixed inset-0 flex items-center justify-center bg-transparent backdrop-blur-none pointer-events-none transition-all duration-500 z-50 opacity-0';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
  initControlPanel(launch, reset, params);
  animate();
});