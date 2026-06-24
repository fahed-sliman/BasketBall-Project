import type { SimParams, PhysicsState, TrajectoryPoint, AnalyticsData } from '../types';
import { getAccelerations } from './forces';

export function computeFullTrajectory(params: SimParams): TrajectoryPoint[] {
  const dt = 0.005;
  const b = 0.1;
  const ball_radius = 0.12;

  const thetaRad = (params.theta * Math.PI) / 180;
  const phiRad = (params.phi * Math.PI) / 180;

  let state: PhysicsState = {
    x: 0,
    y: 2.0,
    z: 0,
    vx: params.v0 * Math.cos(thetaRad) * Math.cos(phiRad),
    vy: params.v0 * Math.sin(thetaRad),
    vz: params.v0 * Math.cos(thetaRad) * Math.sin(phiRad),
    omega: params.omega
  };

  const trajectory: TrajectoryPoint[] = [];
  let currentTime = 0;

  trajectory.push({ ...state, time: currentTime });

  while (state.y >= 0 && currentTime <= 5.0) {
    const s = state;

    // k1 Sample Points
    const acc1 = getAccelerations(s, params);
    const k1_v = { dx: s.vx, dy: s.vy, dz: s.vz };
    const k1_a = { dvx: acc1.ax, dvy: acc1.ay, dvz: acc1.az };

    // k2 Sample Points
    const s2: PhysicsState = {
      x: s.x + k1_v.dx * (dt / 2),
      y: s.y + k1_v.dy * (dt / 2),
      z: s.z + k1_v.dz * (dt / 2),
      vx: s.vx + k1_a.dvx * (dt / 2),
      vy: s.vy + k1_a.dvy * (dt / 2),
      vz: s.vz + k1_a.dvz * (dt / 2),
      omega: s.omega
    };
    const acc2 = getAccelerations(s2, params);
    const k2_v = { dx: s2.vx, dy: s2.vy, dz: s2.vz };
    const k2_a = { dvx: acc2.ax, dvy: acc2.ay, dvz: acc2.az };

    // k3 Sample Points
    const s3: PhysicsState = {
      x: s.x + k2_v.dx * (dt / 2),
      y: s.y + k2_v.dy * (dt / 2),
      z: s.z + k2_v.dz * (dt / 2),
      vx: s.vx + k2_a.dvx * (dt / 2),
      vy: s.vy + k2_a.dvy * (dt / 2),
      vz: s.vz + k2_a.dvz * (dt / 2),
      omega: s.omega
    };
    const acc3 = getAccelerations(s3, params);
    const k3_v = { dx: s3.vx, dy: s3.vy, dz: s3.vz };
    const k3_a = { dvx: acc3.ax, dvy: acc3.ay, dvz: acc3.az };

    // k4 Sample Points
    const s4: PhysicsState = {
      x: s.x + k3_v.dx * dt,
      y: s.y + k3_v.dy * dt,
      z: s.z + k3_v.dz * dt,
      vx: s.vx + k3_a.dvx * dt,
      vy: s.vy + k3_a.dvy * dt,
      vz: s.vz + k3_a.dvz * dt,
      omega: s.omega
    };
    const acc4 = getAccelerations(s4, params);
    const k4_v = { dx: s4.vx, dy: s4.vy, dz: s4.vz };
    const k4_a = { dvx: acc4.ax, dvy: acc4.ay, dvz: acc4.az };

    // Update position components
    state.x += (dt / 6.0) * (k1_v.dx + 2 * k2_v.dx + 2 * k3_v.dx + k4_v.dx);
    state.y += (dt / 6.0) * (k1_v.dy + 2 * k2_v.dy + 2 * k3_v.dy + k4_v.dy);
    state.z += (dt / 6.0) * (k1_v.dz + 2 * k2_v.dz + 2 * k3_v.dz + k4_v.dz);

    // Update velocity components
    state.vx += (dt / 6.0) * (k1_a.dvx + 2 * k2_a.dvx + 2 * k3_a.dvx + k4_a.dvx);
    state.vy += (dt / 6.0) * (k1_a.dvy + 2 * k2_a.dvy + 2 * k3_a.dvy + k4_a.dvy);
    state.vz += (dt / 6.0) * (k1_a.dvz + 2 * k2_a.dvz + 2 * k3_a.dvz + k4_a.dvz);

    // Exponential angular spin decay
    state.omega = state.omega * Math.exp(-b * dt);
    currentTime += dt;

    // Rigid Elastic Collision: Backboard Bounds Check
    const boardX = params.x_hoop + 0.3;
    if (state.vx > 0 && Math.abs(state.x - boardX) <= ball_radius) {
      if (state.y >= 2.75 && state.y <= 3.82 && state.z >= -0.915 && state.z <= 0.915) {
        state.x = boardX - ball_radius;
        state.vx = -0.5 * state.vx;
      }
    }

    // Rigid Elastic Collision: Hoop Ring Boundary Vector Reflection
    const rimRadius = 0.225;
    const dx = state.x - params.x_hoop;
    const dz = state.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz) || 0.001;
    
    // Nearest horizontal surface coordinates along torus ring path
    const closestRingX = params.x_hoop + (dx / horizontalDistance) * rimRadius;
    const closestRingZ = (dz / horizontalDistance) * rimRadius;
    const closestRingY = 3.05;

    const deltaX = state.x - closestRingX;
    const deltaY = state.y - closestRingY;
    const deltaZ = state.z - closestRingZ;
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ) || 0.001;

    if (totalDistance < ball_radius) {
      const nx = deltaX / totalDistance;
      const ny = deltaY / totalDistance;
      const nz = deltaZ / totalDistance;

      const dotProduct = state.vx * nx + state.vy * ny + state.vz * nz;
      if (dotProduct < 0) {
        state.vx = (state.vx - 2.0 * dotProduct * nx) * 0.6;
        state.vy = (state.vy - 2.0 * dotProduct * ny) * 0.6;
        state.vz = (state.vz - 2.0 * dotProduct * nz) * 0.6;

        state.x = closestRingX + nx * ball_radius;
        state.y = closestRingY + ny * ball_radius;
        state.z = closestRingZ + nz * ball_radius;
      }
    }

    trajectory.push({ ...state, time: currentTime });
  }

  return trajectory;
}

export function analyzeTrajectory(trajectory: TrajectoryPoint[], params: SimParams): AnalyticsData {
  let maxHeight = 2.0;
  let scored = false;
  let entryAngle = 0;

  for (let i = 0; i < trajectory.length; i++) {
    const pt = trajectory[i];
    if (pt.y > maxHeight) maxHeight = pt.y;

    if (i > 0) {
      const prev = trajectory[i - 1];
      if (prev.y >= 3.05 && pt.y <= 3.05 && pt.vy < 0) {
        const factor = (3.05 - prev.y) / (pt.y - prev.y);
        const intersectX = prev.x + factor * (pt.x - prev.x);
        const intersectZ = prev.z + factor * (pt.z - prev.z);
        const horizontalRadius = Math.sqrt(Math.pow(intersectX - params.x_hoop, 2) + Math.pow(intersectZ, 2));

        if (horizontalRadius < 0.225) {
          scored = true;
        }
        const horizontalSpeed = Math.sqrt(pt.vx * pt.vx + pt.vz * pt.vz) || 0.001;
        entryAngle = Math.abs(Math.atan2(pt.vy, horizontalSpeed) * (180 / Math.PI));
      }
    }
  }

  const finalPt = trajectory[trajectory.length - 1];
  return {
    maxHeight,
    range: finalPt.x,
    flightTime: finalPt.time,
    entryAngle: entryAngle || Math.abs(Math.atan2(finalPt.vy, finalPt.vx) * (180 / Math.PI)),
    scored
  };
}