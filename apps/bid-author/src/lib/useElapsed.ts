import { useEffect, useState } from "react";

/**
 * Seconds since something started, or null when nothing is running.
 *
 * Drafting a section takes the better part of a minute, and the button alone
 * said only "Drafting…" for all of it. A control that gives no sign of progress
 * for that long is indistinguishable from one that has failed, which is how the
 * first person to use it described it: it does not work.
 *
 * A number that visibly climbs is the cheapest possible fix and the honest one.
 * It does not claim to know how long is left; it shows that something is still
 * happening.
 */
export function useElapsed(running: boolean): number | null {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!running) {
      setSeconds(null);
      return;
    }
    const startedAt = Date.now();
    setSeconds(0);
    const timer = window.setInterval(
      () => setSeconds(Math.round((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [running]);

  return seconds;
}
