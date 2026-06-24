export type SpinType = 'Backspin' | 'Topspin' | 'None';
export type VenueType = 'Indoor' | 'Outdoor';

export interface SimParams {
  v0: number;
  theta: number;
  phi: number;
  omega: number;
  spinType: SpinType;
  venue: VenueType;
  windX: number;
  windZ: number;
  mass: number;
  cd: number;
  x_hoop: number;
  playbackSpeed: number;
}

export interface PhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  omega: number;
}

export interface TrajectoryPoint extends PhysicsState {
  time: number;
}

export interface AnalyticsData {
  maxHeight: number;
  range: number;
  flightTime: number;
  entryAngle: number;
  scored: boolean;
}

