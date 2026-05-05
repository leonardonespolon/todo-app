export function playPewPew() {
  const ctx = new AudioContext();

  function pew(startTime) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, startTime);
    osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.15);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  pew(ctx.currentTime);
  pew(ctx.currentTime + 0.2);
}
