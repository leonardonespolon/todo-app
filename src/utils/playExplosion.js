let completionCount = 0;

export function playExplosion() {
  completionCount++;
  const isStreak = completionCount % 10 === 0;
  const msg = isStreak
    ? 'SUPER STREAK! You are killing it!'
    : 'Great job, keep going!';
  const utter = new SpeechSynthesisUtterance(msg);
  utter.rate = isStreak ? 1.15 : 1;
  utter.pitch = isStreak ? 1.3 : 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
