import PlayerControls from "@Components/moleculas/PlayerControl/PlayerControls";
import Timeline from "@Components/moleculas/PlayerControl/Timeline";
import VolumeControl from "@Components/moleculas/PlayerControl/VolumeControl";
import { useRef, useState } from "react";



const ControlMusic = () => {
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

    isPlaying ? audio.pause() : audio.play();
    setIsPlaying(!isPlaying);
  };

  const animateWaveform = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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
        gradient.addColorStop(0, "#8b5cf6");
        gradient.addColorStop(1, "#3b82f6");
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

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  };

  const handleForward = () => {
    const audio = audioRef.current;
    if (audio) audio.currentTime += 10;
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (audio) audio.currentTime -= 10;
  };

  return (
   <div className="w-[400px] ml-4 p-4 bg-gray-900 text-white rounded-2xl shadow-lg flex flex-col items-start text-left">
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

  <div className="w-full">
    <Timeline
      currentTime={currentTime}
      duration={duration}
      onSeek={handleSeek}
    />
  </div>

  <div className="flex items-start justify-start w-full mt-4 gap-4">
    <PlayerControls
      isPlaying={isPlaying}
      onPlayPause={handlePlayPause}
      onForward={handleForward}
      onRewind={handleRewind}
    />
    <VolumeControl volume={volume} onChange={handleVolumeChange} />
  </div>
</div>

  );
};

export default ControlMusic;
