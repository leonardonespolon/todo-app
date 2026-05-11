import yeahooUrl from '../assets/sounds/yeahoo.mp3';
import starPowerUrl from '../assets/sounds/super-mario-bros-nes-music-star-theme-cut-mp3.mp3';

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
  const url = completionCount % 10 === 0 ? starPowerUrl : yeahooUrl;
  new Audio(url).play().catch(() => {});
}
