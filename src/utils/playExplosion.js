export function playExplosion() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  // Soft chime: C5 → E5 → G5
  [523.25, 659.25, 784].forEach((freq, i) => {
    const t = now + i * 0.08;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
