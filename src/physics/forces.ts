import type { SimParams, PhysicsState } from '../types';

export function getAccelerations(state: PhysicsState, params: SimParams): { ax: number; ay: number; az: number } {
  const { vx, vy, vz, omega } = state;
  const { mass, cd, venue, windX, windZ, spinType } = params;

  const D = 0.24
  const A = Math.PI * (D / 2) * (D / 2);
  const Cl = 0.25;
  const Cw = 0.8;
  const g = 9.8;
  const rho = venue === 'Indoor' ? 1.2 : 1.1;

  const v = Math.sqrt(vx * vx + vy * vy + vz * vz) || 0.001;

  // Drag accelerations
  const dragFactor = -(1.0 / (2.0 * mass)) * cd * rho * A * v;
  const ax_drag = dragFactor * vx;
  const ay_drag = dragFactor * vy;
  const az_drag = dragFactor * vz;

  
  // Wind accelerations relative to flow vectors
  const v_rel_x = windX - vx;
  const v_rel_z = windZ - vz;
  const ax_wind = (1.0 / (2.0 * mass)) * Cw * rho * A * v_rel_x * Math.abs(v_rel_x);
  const az_wind = (1.0 / (2.0 * mass)) * Cw * rho * A * v_rel_z * Math.abs(v_rel_z);

  // Academic Aerodynamic Magnus Lift Evaluation
  let a_magnus = 0;
  if (spinType === 'Backspin') {
    a_magnus = +(rho * A * Cl * omega * vx) / (2.0 * mass);
  } else if (spinType === 'Topspin') {
    a_magnus = -(rho * A * Cl * omega * vx) / (2.0 * mass);
  }

  return {
    ax: ax_drag + ax_wind,
    ay: -g + ay_drag + a_magnus,
    az: az_drag + az_wind
  };
}