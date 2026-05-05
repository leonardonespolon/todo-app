export function playExplosion() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  const compressor = ctx.createDynamicsCompressor();
  compressor.connect(ctx.destination);

  // Low boom: sine that drops in pitch fast
  const boom = ctx.createOscillator();
  const boomGain = ctx.createGain();
  boom.connect(boomGain);
  boomGain.connect(compressor);
  boom.type = 'sine';
  boom.frequency.setValueAtTime(150, now);
  boom.frequency.exponentialRampToValueAtTime(30, now + 0.5);
  boomGain.gain.setValueAtTime(0.9, now);
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  boom.start(now);
  boom.stop(now + 0.6);

  // Noise burst for crunch and texture
  const bufLen = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 350;
  noiseFilter.Q.value = 0.8;
  const noiseGain = ctx.createGain();
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(compressor);
  noiseGain.gain.setValueAtTime(0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  noise.start(now);
  noise.stop(now + 0.5);

  // Victory arpeggio: C5 → E5 → G5
  [523.25, 659.25, 784].forEach((freq, i) => {
    const t = now + 0.05 + i * 0.1;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(compressor);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}
