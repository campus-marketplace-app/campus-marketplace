import { useEffect, useState } from "react";

// Counts from 0 to `target` over `duration` ms using an ease-out (sqrt) curve.
// Used by the home page and the seller dashboard for the headline stat counters.
export function useCountUp(target: number | undefined, duration = 900): number {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (target === undefined) return;
        if (target === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrent(0);
            return;
        }

        const start = performance.now();
        // rafId can be undefined if the component unmounts before the first frame fires
        // — guard the cleanup so we never call cancelAnimationFrame(undefined).
        let rafId: number | undefined;

        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCurrent(Math.round(target * Math.sqrt(progress)));
            if (progress < 1) rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => {
            if (rafId !== undefined) cancelAnimationFrame(rafId);
        };
    }, [target, duration]);

    return current;
}
