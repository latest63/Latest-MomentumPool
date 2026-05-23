'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export default function ThemeAudio() {
  const [muted, setMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);

  const post = useCallback((func: string, args: string = '') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  }, []);

  // First user interaction → unmute
  useEffect(() => {
    const handler = () => {
      if (ready.current) return;
      ready.current = true;
      post('unMute', '');
      post('setVolume', '40');
      setMuted(false);
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [post]);

  const toggleMute = useCallback(() => {
    if (!ready.current) return;
    if (muted) {
      post('unMute', '');
      post('setVolume', '40');
    } else {
      post('mute', '');
    }
    setMuted(m => !m);
  }, [muted, post]);

  return (
    <div className="theme-song">
      <iframe
        ref={iframeRef}
        id="theme-youtube"
        src="https://www.youtube.com/embed/Ymo1X5pPJU8?enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=Ymo1X5pPJU8"
        className="theme-song-iframe"
        allow="autoplay"
        title="Dai Dai (Instrumental) - Shakira ft Burna Boy"
      />
      <button
        className="theme-song-btn"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}
