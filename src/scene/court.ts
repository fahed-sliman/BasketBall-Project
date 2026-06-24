import * as THREE from 'three';

export function createCourt(): THREE.Group {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Render court markings pattern layout
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  const size = 64;
  for (let x = 0; x < canvas.width; x += size) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += size) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Draw main perimeter boundaries
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Paint boundaries setup
  ctx.strokeRect(20, canvas.height / 2 - 200, 350, 400);

  // Arc structures
  ctx.beginPath();
  ctx.arc(370, canvas.height / 2, 120, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(20, canvas.height / 2, 600, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 });
  const geometry = new THREE.PlaneGeometry(30, 15);
  const floor = new THREE.Mesh(geometry, material);
  
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(13, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);

  return group;
}