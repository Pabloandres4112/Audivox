import React, { useRef, useState, useEffect } from 'react';

const MusicPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioContext) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      source.connect(analyser);
      analyser.connect(context.destination);
      setAudioContext(context);
      animateWaveform(analyser);
    }
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const animateWaveform = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bufferLength;
      const centerY = canvas.height / 2;

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const height = value * 0.75;
        const x = i * barWidth;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#8b5cf6'); // violet-500
        gradient.addColorStop(1, '#3b82f6'); // blue-500
        ctx.fillStyle = gradient;

        const radius = barWidth / 2;
        const y = centerY - height / 2;
        const roundedHeight = height > radius * 2 ? height - radius * 2 : 0;

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
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) {
      const time = parseFloat(e.target.value);
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 bg-gray-900 text-white rounded-2xl shadow-lg">
      <audio
        ref={audioRef}
        src="/music/GustarmeTanto.mp3"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <canvas
        ref={canvasRef}
        width={500}
        height={100}
        className="w-full mb-6 rounded-xl bg-gray-800"
      />

      <input
        type="range"
        min="0"
        max={duration}
        step="0.01"
        value={currentTime}
        onChange={handleSeek}
        className="w-full accent-purple-500"
      />
      <div className="flex justify-between text-sm text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div className="flex items-center justify-between mt-4">
        {/* Rewind */}
        <button onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)}>
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 18V6l-8.5 6L11 18zm1-12v12l8.5-6L12 6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="bg-white text-black rounded-full p-3 shadow-lg"
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Forward */}
        <button onClick={() => audioRef.current && (audioRef.current.currentTime += 10)}>
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 6v12l8.5-6L13 6zm-1 0L3.5 12 12 18V6z" />
          </svg>
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 ml-4">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10v4h3l4 4V6l-4 4H7z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="accent-purple-500"
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
