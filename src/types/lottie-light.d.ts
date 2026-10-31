// The light build (no expressions or effects) is a third of the size of the full player and has no bundled types.
declare module 'lottie-web/build/player/lottie_light' {
  import type { AnimationItem, AnimationConfigWithPath } from 'lottie-web';
  const lottie: { loadAnimation(params: AnimationConfigWithPath<'svg'>): AnimationItem };
  export default lottie;
}
