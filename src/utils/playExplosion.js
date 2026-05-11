const STREAK_KEY = 'todo-completion-streak';

function getCount() {
  return parseInt(localStorage.getItem(STREAK_KEY) ?? '0', 10);
}

function saveCount(n) {
  localStorage.setItem(STREAK_KEY, String(n));
}

export function playExplosion() {
  const completionCount = getCount() + 1;
  saveCount(completionCount);
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
