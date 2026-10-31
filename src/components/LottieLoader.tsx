import { useEffect, useRef } from 'react';

/** A small looping loader. The light Lottie player is fetched only when this appears, so the rest of the app stays small. */
export function LottieLoader({ src = '/lottie/resync-loader.json', className }: { src?: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animation: { destroy: () => void } | null = null;
    let cancelled = false;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (cancelled || !host.current) return;
      animation = lottie.loadAnimation({ container: host.current, renderer: 'svg', loop: true, autoplay: !reduceMotion, path: src });
    }).catch(() => { /* the percentage and text still show progress without the animation */ });
    return () => { cancelled = true; animation?.destroy(); };
  }, [src]);

  return <div ref={host} className={className} aria-hidden="true" />;
}
