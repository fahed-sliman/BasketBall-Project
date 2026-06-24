import * as THREE from 'three';

export function createHoopAssembly(x_hoop: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "hoopAssembly";

  // Orange Rim Torus configuration geometry
  const rimGeo = new THREE.TorusGeometry(0.225, 0.02, 16, 64);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.3, metalness: 0.2 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x_hoop, 3.05, 0);
  rim.castShadow = true;
  group.add(rim);

  // Procedural canvas design backboard interface asset maps
  const bbCanvas = document.createElement('canvas');
  bbCanvas.width = 512;
  bbCanvas.height = 256;
  const ctx = bbCanvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 0, bbCanvas.width, bbCanvas.height);
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, bbCanvas.width - 20, bbCanvas.height - 20);

  ctx.strokeStyle = '#ff6b35';
  ctx.lineWidth = 12;
  ctx.strokeRect(bbCanvas.width / 2 - 90, bbCanvas.height - 130, 180, 120);

  const bbTexture = new THREE.CanvasTexture(bbCanvas);
  const bbGeo = new THREE.PlaneGeometry(1.83, 1.07);
  const bbMat = new THREE.MeshStandardMaterial({ map: bbTexture, transparent: true, side: THREE.DoubleSide });
  const backboard = new THREE.Mesh(bbGeo, bbMat);
  backboard.rotation.y = -Math.PI / 2;
  backboard.position.set(x_hoop + 0.3, 3.285, 0);
  backboard.castShadow = true;
  group.add(backboard);

  // Base Structural grounding post configurations
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 4.0, 16);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(x_hoop + 0.4, 2.0, 0);
  pole.castShadow = true;
  group.add(pole);

  return group;
}