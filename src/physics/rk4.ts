import type { SimParams, PhysicsState, TrajectoryPoint, AnalyticsData } from '../types';
import { getAccelerations, resolvePlaneCollision, getCollisionImpulseForce } from './forces';

let _maxCollisionImpulse = 0;

export function computeFullTrajectory(params: SimParams): TrajectoryPoint[] {
  const dt = 0.005;
  _maxCollisionImpulse = 0;
  const ball_radius       = 0.12;
  const collisionFriction = 0.6;
  const groundFriction    = 0.7;
  const rimRadius         = 0.225;
  const hoopY             = 3.05;
  const boardX            = params.x_hoop + 0.3;

  const thetaRad = (params.theta * Math.PI) / 180;
  const phiRad   = (params.phi   * Math.PI) / 180;

  let state: PhysicsState = {
    x:     0,
    y:     2.0,
    z:     0,
    vx:    params.v0 * Math.cos(thetaRad) * Math.cos(phiRad),
    vy:    params.v0 * Math.sin(thetaRad),
    vz:    params.v0 * Math.cos(thetaRad) * Math.sin(phiRad),
    omega: params.omega,
  };

  const trajectory: TrajectoryPoint[] = [];
  let currentTime = 0;
  trajectory.push({ ...state, time: currentTime });

  while (currentTime <= 5.0) {
    // ── RK4 (use spread to avoid reference aliasing) ──────────────────
    const s = { ...state };

    const acc1 = getAccelerations(s, params);
    const k1v  = { dx: s.vx, dy: s.vy, dz: s.vz };
    const k1a  = { dvx: acc1.ax, dvy: acc1.ay, dvz: acc1.az };

    const s2: PhysicsState = {
      x: s.x + k1v.dx*(dt/2), y: s.y + k1v.dy*(dt/2), z: s.z + k1v.dz*(dt/2),
      vx: s.vx + k1a.dvx*(dt/2), vy: s.vy + k1a.dvy*(dt/2), vz: s.vz + k1a.dvz*(dt/2),
      omega: s.omega,
    };
    const acc2 = getAccelerations(s2, params);
    const k2v  = { dx: s2.vx, dy: s2.vy, dz: s2.vz };
    const k2a  = { dvx: acc2.ax, dvy: acc2.ay, dvz: acc2.az };

    const s3: PhysicsState = {
      x: s.x + k2v.dx*(dt/2), y: s.y + k2v.dy*(dt/2), z: s.z + k2v.dz*(dt/2),
      vx: s.vx + k2a.dvx*(dt/2), vy: s.vy + k2a.dvy*(dt/2), vz: s.vz + k2a.dvz*(dt/2),
      omega: s.omega,
    };
    const acc3 = getAccelerations(s3, params);
    const k3v  = { dx: s3.vx, dy: s3.vy, dz: s3.vz };
    const k3a  = { dvx: acc3.ax, dvy: acc3.ay, dvz: acc3.az };

    const s4: PhysicsState = {
      x: s.x + k3v.dx*dt, y: s.y + k3v.dy*dt, z: s.z + k3v.dz*dt,
      vx: s.vx + k3a.dvx*dt, vy: s.vy + k3a.dvy*dt, vz: s.vz + k3a.dvz*dt,
      omega: s.omega,
    };
    const acc4 = getAccelerations(s4, params);
    const k4v  = { dx: s4.vx, dy: s4.vy, dz: s4.vz };
    const k4a  = { dvx: acc4.ax, dvy: acc4.ay, dvz: acc4.az };

    state.x  += (dt/6) * (k1v.dx + 2*k2v.dx + 2*k3v.dx + k4v.dx);
    state.y  += (dt/6) * (k1v.dy + 2*k2v.dy + 2*k3v.dy + k4v.dy);
    state.z  += (dt/6) * (k1v.dz + 2*k2v.dz + 2*k3v.dz + k4v.dz);
    state.vx += (dt/6) * (k1a.dvx + 2*k2a.dvx + 2*k3a.dvx + k4a.dvx);
    state.vy += (dt/6) * (k1a.dvy + 2*k2a.dvy + 2*k3a.dvy + k4a.dvy);
    state.vz += (dt/6) * (k1a.dvz + 2*k2a.dvz + 2*k3a.dvz + k4a.dvz);
    state.omega *= Math.exp(-params.spinDecay * dt);
    currentTime += dt;

    // ── GROUND BOUNCE ─────────────────────────────────────────────────
    if (state.y <= ball_radius) {
      state.y = ball_radius;
      if (state.vy < 0) {
        const vyBefore = state.vy;
        // Kill micro-bounces: if post-bounce vy would be tiny, stop vertical motion
        const vyAfter = params.restitution * Math.abs(state.vy);
        state.vy = vyAfter < 0.3 ? 0 : vyAfter;
        state.vx *= groundFriction;
        state.vz *= groundFriction;
        state.omega *= collisionFriction;

        const impulse = getCollisionImpulseForce(
          params.mass, 0, vyBefore, 0, 0, state.vy, 0, dt
        );
        if (impulse > _maxCollisionImpulse) _maxCollisionImpulse = impulse;
      }
    }// ── BACKBOARD ─────────────────────────────────────────────────────
    if (state.vx > 0 && Math.abs(state.x - boardX) <= ball_radius) {
      if (state.y >= 2.75 && state.y <= 3.82 &&
          state.z >= -0.915 && state.z <= 0.915) {
        state.x = boardX - ball_radius;
        const vxBefore = state.vx;
        state.vx = resolvePlaneCollision(state.vx, params.restitution);
        state.omega *= collisionFriction;

        const impulse = getCollisionImpulseForce(
          params.mass, vxBefore, 0, 0, state.vx, 0, 0, dt
        );
        if (impulse > _maxCollisionImpulse) _maxCollisionImpulse = impulse;
      }
    }

    // ── RIM COLLISION ─────────────────────────────────────────────────
    const dx        = state.x - params.x_hoop;
    const dz        = state.z;
    const horizDist = Math.sqrt(dx*dx + dz*dz) || 0.001;

    const closestRingX = params.x_hoop + (dx / horizDist) * rimRadius;
    const closestRingY = hoopY;
    const closestRingZ = (dz / horizDist) * rimRadius;

    const deltaX    = state.x - closestRingX;
    const deltaY    = state.y - closestRingY;
    const deltaZ    = state.z - closestRingZ;
    const totalDist = Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ) || 0.001;

    if (totalDist < ball_radius) {
      const nx = deltaX / totalDist;
      const ny = deltaY / totalDist;
      const nz = deltaZ / totalDist;
      const dot = state.vx*nx + state.vy*ny + state.vz*nz;

      if (dot < 0) {
        const vxBefore = state.vx, vyBefore = state.vy, vzBefore = state.vz;
        const factor = (1 + params.restitution) * dot;
        state.vx -= factor * nx;
        state.vy -= factor * ny;
        state.vz -= factor * nz;
        state.x = closestRingX + nx * ball_radius;
        state.y = closestRingY + ny * ball_radius;
        state.z = closestRingZ + nz * ball_radius;
        state.omega *= collisionFriction;

        const impulse = getCollisionImpulseForce(
          params.mass, vxBefore, vyBefore, vzBefore,
          state.vx, state.vy, state.vz, dt
        );
        if (impulse > _maxCollisionImpulse) _maxCollisionImpulse = impulse;
      }
    }

    trajectory.push({ ...state, time: currentTime });

    // ── REST STATE ────────────────────────────────────────────────────
    const speedH = Math.sqrt(state.vx*state.vx + state.vz*state.vz);
    if (state.y <= ball_radius + 0.01 &&
        Math.abs(state.vy) < 0.1 &&
        speedH < 0.1 &&
        state.omega < 0.5) {
      state.vx = 0; state.vy = 0; state.vz = 0; state.omega = 0;
      break;
    }
  }

  return trajectory;
}

export function analyzeTrajectory(
  trajectory: TrajectoryPoint[],
  params: SimParams
): AnalyticsData {
  let maxHeight  = 2.0;
  let scored     = false;
  let entryAngle = 0;

  for (let i = 1; i < trajectory.length; i++) {
    const pt   = trajectory[i];
    const prev = trajectory[i - 1];

    if (pt.y > maxHeight) maxHeight = pt.y;

    if (prev.y >= 3.05 && pt.y <= 3.05 && pt.vy < 0) {
      const factor      = (3.05 - prev.y) / (pt.y - prev.y);
      const intersectX  = prev.x + factor * (pt.x - prev.x);
      const intersectZ  = prev.z + factor * (pt.z - prev.z);
      const horizRadius = Math.sqrt(
        (intersectX - params.x_hoop)**2 + intersectZ**2
      );

      if (horizRadius < 0.225) scored = true;

      const horizSpeed = Math.sqrt(pt.vx*pt.vx + pt.vz*pt.vz) || 0.001;
      entryAngle = Math.abs(Math.atan2(pt.vy, horizSpeed) * (180 / Math.PI));
    }
  }

  const finalPt = trajectory[trajectory.length - 1];
  return {
    maxHeight,
    range:               finalPt.x,
    flightTime:          finalPt.time,
    entryAngle:          entryAngle || Math.abs(Math.atan2(finalPt.vy, finalPt.vx) * (180 / Math.PI)),
    scored,
    maxCollisionImpulse: _maxCollisionImpulse,
  };
}