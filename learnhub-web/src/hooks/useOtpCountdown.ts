import { useCallback, useEffect, useRef, useState } from 'react';

interface OtpCountdownState {
  expiresIn: number;
  resendAfter: number;
}

const EMPTY_COUNTDOWN: OtpCountdownState = { expiresIn: 0, resendAfter: 0 };

export const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

export function useOtpCountdown(active: boolean) {
  const [countdown, setCountdown] = useState<OtpCountdownState>(EMPTY_COUNTDOWN);
  const expiresAtRef = useRef(0);
  const resendAtRef = useRef(0);
  const running = countdown.expiresIn > 0 || countdown.resendAfter > 0;

  useEffect(() => {
    if (!active || !running) return;

    const update = () => {
      const now = Date.now();
      setCountdown({
        expiresIn: Math.max(0, Math.ceil((expiresAtRef.current - now) / 1000)),
        resendAfter: Math.max(0, Math.ceil((resendAtRef.current - now) / 1000)),
      });
    };

    update();
    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, [active, running]);

  const startCountdown = useCallback((expiresIn: number, resendAfter: number) => {
    const now = Date.now();
    expiresAtRef.current = now + Math.max(0, expiresIn) * 1000;
    resendAtRef.current = now + Math.max(0, resendAfter) * 1000;
    setCountdown({
      expiresIn: Math.max(0, Math.ceil((expiresAtRef.current - now) / 1000)),
      resendAfter: Math.max(0, Math.ceil((resendAtRef.current - now) / 1000)),
    });
  }, []);

  return { ...countdown, startCountdown };
}
