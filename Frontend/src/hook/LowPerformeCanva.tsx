import React, { useState, useEffect, useRef } from 'react'

export default function LowPerformeCanva() {
    const frameRef = useRef(0);
    const startTimeRef = useRef(performance.now());
    const [isLowPerformance, setIsLowPerformance] = useState(false);

    useEffect(() => {
        const interval = () => {
            frameRef.current++;
            const now = performance.now();
            const elapsed = now - startTimeRef.current;
            if (elapsed >= 1000) {
                if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
                    setIsLowPerformance(true);
                }
                const fps = frameRef.current / (elapsed / 1000);
                if (fps < 40) {
                    setIsLowPerformance(true);
                }
                frameRef.current = 0;
                startTimeRef.current = now;
            }
            requestAnimationFrame(interval);
        };
        requestAnimationFrame(interval);
        return () => {
            setIsLowPerformance(false);
        }
    }, []);

    return (
        <div>{isLowPerformance ? 'Baja performance' : 'Alta performance'}</div>
    )
}

