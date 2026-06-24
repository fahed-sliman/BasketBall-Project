import * as THREE from 'three';

export function createBallMesh(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#05070f';
  ctx.lineWidth = 10;

  // Horizontal primary line channel
  ctx.beginPath(); ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2); ctx.stroke();

  // Vertical primary line channel
  ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();

  // Curvature seam offsets map
  ctx.beginPath(); ctx.arc(canvas.width / 4, canvas.height / 2, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(3 * canvas.width / 4, canvas.height / 2, 150, 0, Math.PI * 2); ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.SphereGeometry(0.12, 32, 32);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.05 });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.set(0, 2.0, 0);

  return mesh;
}

export function updateBallRotation(mesh: THREE.Mesh, omega: number, vx: number, vz: number, dt: number) {
  if (omega <= 0) return;
  
  // Resolve trajectory horizontal heading vectors safely
  const speedH = Math.sqrt(vx * vx + vz * vz);
  if (speedH > 0.01) {
    const dirX = vx / speedH;
    const dirZ = vz / speedH;

    // Apply pitch rotations relative to transverse axis mapping standard -Z properties
    const rotationAxis = new THREE.Vector3(-dirZ, 0, dirX);
    mesh.rotateOnWorldAxis(rotationAxis, omega * dt);
  } else {
    mesh.rotation.z -= omega * dt;
  }
}