import type { SimParams } from '../types';

export function initControlPanel(onLaunch: () => void, onReset: () => void, params: SimParams) {
  const setupSlider = (id: string, key: keyof SimParams) => {
    const el = document.getElementById(id) as HTMLInputElement;
    const view = document.getElementById(`${id}-val`);
    if (!el) return;

    el.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      (params as any)[key] = value;
      if (view) view.innerText = value.toString();
    });
  };

  setupSlider('v0', 'v0');
  setupSlider('theta', 'theta');
  setupSlider('phi', 'phi');
  setupSlider('omega', 'omega');
  setupSlider('windX', 'windX');
  setupSlider('windZ', 'windZ');
  setupSlider('mass', 'mass');
  setupSlider('cd', 'cd');
  setupSlider('x_hoop', 'x_hoop');

  // Multi-type selection selectors loops configuration bindings
  document.querySelectorAll('.spin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.spin-btn').forEach(b => b.classList.remove('bg-orange-500', 'text-white'));
      const target = e.target as HTMLButtonElement;
      target.classList.add('bg-orange-500', 'text-white');
      params.spinType = target.dataset.value as any;
    });
  });

  document.querySelectorAll('.venue-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.venue-btn').forEach(b => b.classList.remove('bg-cyan-500', 'text-white'));
      const target = e.target as HTMLButtonElement;
      target.classList.add('bg-cyan-500', 'text-white');
      params.venue = target.dataset.value as any;
    });
  });

  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('bg-slate-600', 'text-white'));
      const target = e.target as HTMLButtonElement;
      target.classList.add('bg-slate-600', 'text-white');
      params.playbackSpeed = parseFloat(target.dataset.value!);
    });
  });

  document.getElementById('launch-btn')?.addEventListener('click', onLaunch);
  document.getElementById('reset-btn')?.addEventListener('click', onReset);

  document.getElementById('analytics-btn')?.addEventListener('click', () => {
    document.getElementById('analytics-overlay')?.classList.toggle('hidden');
  });
}

export function updateTelemetryDisplay(x: number, y: number, z: number, totalV: number, vy: number, omega: number) {
  const p = document.getElementById('tel-pos');
  const s = document.getElementById('tel-spd');
  const v = document.getElementById('tel-vy');
  const w = document.getElementById('tel-omg');

  if (p) p.innerText = `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`;
  if (s) s.innerText = `${totalV.toFixed(2)} m/s`;
  if (v) v.innerText = `${vy.toFixed(2)} m/s`;
  if (w) w.innerText = `${omega.toFixed(1)} rad/s`;
}