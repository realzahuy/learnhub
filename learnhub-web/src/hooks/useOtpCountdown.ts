import { useCallback, useEffect, useState } from 'react';

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
  const running = countdown.expiresIn > 0 || countdown.resendAfter > 0;

  useEffect(() => {
    if (!active || !running) return;

    const timer = window.setInterval(() => {
      setCountdown((current) => {
        const next = {
          expiresIn: Math.max(0, current.expiresIn - 1),
          resendAfter: Math.max(0, current.resendAfter - 1),
        };
        return next.expiresIn === current.expiresIn && next.resendAfter === current.resendAfter
          ? current
          : next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, running]);

  const startCountdown = useCallback((expiresIn: number, resendAfter: number) => {
    setCountdown({
      expiresIn: Math.max(0, expiresIn),
      resendAfter: Math.max(0, resendAfter),
    });
  }, []);

  return { ...countdown, startCountdown };
}
