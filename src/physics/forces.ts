import type { SimParams, PhysicsState } from '../types';

export function getAccelerations(
  state: PhysicsState,
  params: SimParams
): { ax: number; ay: number; az: number } {
  const { vx, vy, vz, omega } = state;
  const { mass, cd, venue, windX, windY, windZ, spinType } = params;

  const D   = 0.24;
  const A   = Math.PI * (D / 2) * (D / 2);
  const Cl  = 0.25;
  const Cw  = 0.8;
  const g   = 9.81;  // standard gravity
  const rho = venue === 'Indoor' ? 1.225 : 1.2;

  const v = Math.sqrt(vx*vx + vy*vy + vz*vz) || 0.001;

  // 1. Drag: F = -½ρCdA·|v|·v⃗
  const dragFactor = -(1 / (2 * mass)) * cd * rho * A * v;
  const ax_drag = dragFactor * vx;
  const ay_drag = dragFactor * vy;
  const az_drag = dragFactor * vz;

  // 2. Wind: quadratic in relative velocity, sign-preserving
  const v_rel_x = windX - vx;
  const v_rel_y = windY - vy;
  const v_rel_z = windZ - vz;
  const windFactor = (1 / (2 * mass)) * Cw * rho * A;
  const ax_wind = windFactor * v_rel_x * Math.abs(v_rel_x);
  const ay_wind = windFactor * v_rel_y * Math.abs(v_rel_y);
  const az_wind = windFactor * v_rel_z * Math.abs(v_rel_z);

  // 3. Magnus: F = ½ρClA·(ω̂ × v⃗)·ω / v
  // Ball travels +X. Spin axes:
  //   Backspin: ω⃗ = +Z → ω⃗×v⃗ gives +Y (lift) ✅
  //   Topspin:  ω⃗ = -Z → ω⃗×v⃗ gives -Y (push down) ✅
  //   Sidespin: ω⃗ = +Y → ω⃗×v⃗ gives lateral (Z) ✅
  let wx = 0, wy = 0, wz = 0;
  if      (spinType === 'Backspin') wz = +1;  // FIXED: was -1
  else if (spinType === 'Topspin')  wz = -1;  // FIXED: was +1
  else if (spinType === 'Sidespin') wy = +1;

  // cross product: ω̂ × v⃗
  const cx = wy*vz - wz*vy;
  const cy = wz*vx - wx*vz;
  const cz = wx*vy - wy*vx;

  const magnusFactor = (rho * A * Cl * omega) / (2 * mass * v);
  const ax_magnus = magnusFactor * cx;
  const ay_magnus = magnusFactor * cy;
  const az_magnus = magnusFactor * cz;

  return {
    ax: ax_drag + ax_wind + ax_magnus,
    ay: -g + ay_drag + ay_wind + ay_magnus,
    az: az_drag + az_wind + az_magnus,
  };
}

export function resolvePlaneCollision(vn: number, restitution: number): number {
  return -restitution * vn;
}

export function getCollisionImpulseForce(
  mass: number,
  vxBefore: number, vyBefore: number, vzBefore: number,
  vxAfter:  number, vyAfter:  number, vzAfter:  number,
  dt: number
): number {
  const dvx = vxAfter  - vxBefore;
  const dvy = vyAfter  - vyBefore;
  const dvz = vzAfter  - vzBefore;
  return mass * Math.sqrt(dvx*dvx + dvy*dvy + dvz*dvz) / dt;
}