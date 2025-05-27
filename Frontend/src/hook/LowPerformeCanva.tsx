import { useState, useEffect, useRef } from "react";

export default function useLowPerformance() {
  const [isLowPerformance, setIsLowPerformance] = useState<boolean | null>(null);
  const frameRef = useRef(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const checkPerformance = () => {
      frameRef.current++;
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      if (elapsed >= 1000) {
        const fps = frameRef.current / (elapsed / 1000);
        const isLow = fps < 40 || (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2);
        setIsLowPerformance(isLow);

        frameRef.current = 0;
        startTimeRef.current = now;
        return;
      }

      animationFrameId = requestAnimationFrame(checkPerformance);
    };

    animationFrameId = requestAnimationFrame(checkPerformance);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return isLowPerformance;
}

