import { useEffect, useRef } from "react";

interface WaveformCanvasProps {
  analyser: AnalyserNode;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / bufferLength;
      const centerY = canvas.height / 2;

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const height = value * 0.75;
        const x = i * barWidth;

        const radius = barWidth / 2;
        const y = centerY - height / 2;
        const roundedHeight = height > radius * 2 ? height - radius * 2 : 0;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#8b5cf6"); // violet-500
        gradient.addColorStop(1, "#3b82f6"); // blue-500
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + roundedHeight + radius);
        ctx.quadraticCurveTo(x + barWidth, y + height, x + barWidth - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={100}
      className="w-full mb-4 rounded-xl bg-gray-800 dark:bg-gray-700"
    />
  );
};

export default WaveformCanvas;
