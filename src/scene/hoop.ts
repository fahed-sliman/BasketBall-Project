import * as THREE from 'three';

export function createHoopAssembly(x_hoop: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "hoopAssembly";

  // ── Rim ───────────────────────────────────────────────────────────────
  const rimGeo = new THREE.TorusGeometry(0.225, 0.02, 16, 64);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, roughness: 0.3, metalness: 0.2 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x_hoop, 3.05, 0);
  rim.castShadow = true;
  group.add(rim);

  group.add(createNet(x_hoop));

  // ── Backboard ─────────────────────────────────────────────────────────
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

  const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 4.0, 16);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(x_hoop + 0.4, 2.0, 0);
  pole.castShadow = true;
  group.add(pole);

  return group;
}

function createNet(x_hoop: number): THREE.Group {
  const netGroup = new THREE.Group();

  const netMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
  });

  const RIM_RADIUS  = 0.225;   // radius of rim ring
  const RIM_Y       = 3.05;    // top of net (rim level)
  const NET_BOTTOM_Y = 2.60;   // bottom opening of net
  const BOTTOM_RADIUS = 0.10;  // net narrows at bottom
  const VERTICAL_STRANDS = 12; // number of vertical strings
  const RING_LEVELS = 6;       // number of horizontal rings


  for (let i = 0; i < VERTICAL_STRANDS; i++) {
    const angle = (i / VERTICAL_STRANDS) * Math.PI * 2;

    const topX = x_hoop + Math.cos(angle) * RIM_RADIUS;
    const topZ = Math.sin(angle) * RIM_RADIUS;
    const botX = x_hoop + Math.cos(angle) * BOTTOM_RADIUS;
    const botZ = Math.sin(angle) * BOTTOM_RADIUS;

    // Mid-point sags inward slightly for a natural net look
    const midRadius = (RIM_RADIUS + BOTTOM_RADIUS) / 2 - 0.03;
    const midY = (RIM_Y + NET_BOTTOM_Y) / 2 - 0.04; // slight sag down

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(topX, RIM_Y, topZ),
      new THREE.Vector3(x_hoop + Math.cos(angle) * midRadius, midY, Math.sin(angle) * midRadius),
      new THREE.Vector3(botX, NET_BOTTOM_Y, botZ),
    ]);

    const pts = curve.getPoints(12);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    netGroup.add(new THREE.Line(geo, netMat));
  }


  for (let r = 0; r <= RING_LEVELS; r++) {
    const t = r / RING_LEVELS;                                 
    const y = RIM_Y + t * (NET_BOTTOM_Y - RIM_Y);
    const radius = RIM_RADIUS + t * (BOTTOM_RADIUS - RIM_RADIUS);

    const ringPts: THREE.Vector3[] = [];
    const RING_SEGMENTS = 32;

    for (let s = 0; s <= RING_SEGMENTS; s++) {
      const angle = (s / RING_SEGMENTS) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(
        x_hoop + Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      ));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(ringPts);
    netGroup.add(new THREE.Line(geo, netMat));
  }

  return netGroup;
}