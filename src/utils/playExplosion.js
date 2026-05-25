import yeahooUrl from '../assets/sounds/yeahoo.mp3';
import starPowerUrl from '../assets/sounds/super-mario-bros-nes-music-star-theme-cut-mp3.mp3';

export function playExplosion(todayCount) {
  const url = todayCount % 10 === 0 ? starPowerUrl : yeahooUrl;
  new Audio(url).play().catch(() => {});
}
