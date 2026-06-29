import * as THREE from 'three';

const PARTICLE_COUNT = 200;
const VOLUME_SIZE = { x: 20, y: 8, z: 12 }; // meters — volume around the court
const VOLUME_CENTER = { x: 6, y: 4, z: 0 };

let points: THREE.Points | null = null;
let positions: Float32Array;
let opacities: Float32Array;
let material: THREE.PointsMaterial;

/**
 * Create the wind particle system and add it to the scene.
 * Returns the Points object for reference.
 */
export function createWindParticles(scene: THREE.Scene): THREE.Points {
  const geometry = new THREE.BufferGeometry();

  positions = new Float32Array(PARTICLE_COUNT * 3);
  opacities = new Float32Array(PARTICLE_COUNT);

  // Initialize particles randomly within the volume
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3]     = VOLUME_CENTER.x + (Math.random() - 0.5) * VOLUME_SIZE.x;
    positions[i * 3 + 1] = VOLUME_CENTER.y + Math.random() * VOLUME_SIZE.y;
    positions[i * 3 + 2] = VOLUME_CENTER.z + (Math.random() - 0.5) * VOLUME_SIZE.z;
    opacities[i] = Math.random();
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.06,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  points = new THREE.Points(geometry, material);
  points.name = 'windParticles';
  scene.add(points);

  return points;
}

/**
 * Update wind particle positions each frame.
 * Particles drift in (windX, 0, windZ) direction.
 * Invisible when wind magnitude is zero.
 */
// In wind.ts — update the function signature:
export function updateWindParticles(windX: number, windY: number, windZ: number, dt: number) {
  if (!points) return;

  const windMag = Math.sqrt(windX**2 + windY**2 + windZ**2);
  material.opacity = Math.min(windMag / 7, 1) * 0.4;
  if (windMag < 0.01) return;

  const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;

  const halfX = VOLUME_SIZE.x / 2;
  const halfZ = VOLUME_SIZE.z / 2;
  const minX = VOLUME_CENTER.x - halfX;
  const maxX = VOLUME_CENTER.x + halfX;
  const minZ = VOLUME_CENTER.z - halfZ;
  const maxZ = VOLUME_CENTER.z + halfZ;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const variation = 0.6 + opacities[i] * 0.8;

    positions[i3]     += windX * dt * variation;
    positions[i3 + 1] += (windY + 0.15 * (0.5 + opacities[i] * 0.5)) * dt; // ← windY + float
    positions[i3 + 2] += windZ * dt * variation;

    // Wrap X
    if (positions[i3] > maxX) positions[i3] = minX;
    if (positions[i3] < minX) positions[i3] = maxX;

    // Wrap Z
    if (positions[i3 + 2] > maxZ) positions[i3 + 2] = minZ;
    if (positions[i3 + 2] < minZ) positions[i3 + 2] = maxZ;

    // Wrap Y — handle both up and down wind
    const maxY = VOLUME_CENTER.y + VOLUME_SIZE.y / 2;
    const minY = VOLUME_CENTER.y - VOLUME_SIZE.y / 2;
    if (positions[i3 + 1] > maxY) {
      positions[i3 + 1] = minY;
      positions[i3]     = VOLUME_CENTER.x + (Math.random() - 0.5) * VOLUME_SIZE.x;
      positions[i3 + 2] = VOLUME_CENTER.z + (Math.random() - 0.5) * VOLUME_SIZE.z;
    }
    if (positions[i3 + 1] < minY) {
      positions[i3 + 1] = maxY;
      positions[i3]     = VOLUME_CENTER.x + (Math.random() - 0.5) * VOLUME_SIZE.x;
      positions[i3 + 2] = VOLUME_CENTER.z + (Math.random() - 0.5) * VOLUME_SIZE.z;
    }
  }

  posAttr.needsUpdate = true;
}