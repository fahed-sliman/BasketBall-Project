import * as THREE from 'three';

export class TrajectoryTrail {
  public mesh: THREE.Line;
  private geometry: THREE.BufferGeometry;
  private maxPoints = 5000;
  private points: number[] = [];

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxPoints * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x00c9ff,
      linewidth: 4,
      transparent: true,
      opacity: 0.8
    });

    this.mesh = new THREE.Line(this.geometry, material);
    scene.add(this.mesh);
  }

  public addPoint(x: number, y: number, z: number) {
    this.points.push(x, y, z);
    const positionAttribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    
    const index = (this.points.length / 3) - 1;
    if (index < this.maxPoints) {
      positionAttribute.setXYZ(index, x, y, z);
      this.geometry.setDrawRange(0, index + 1);
      positionAttribute.needsUpdate = true;
    }
  }

  public clear() {
    this.points = [];
    this.geometry.setDrawRange(0, 0);
  }
}