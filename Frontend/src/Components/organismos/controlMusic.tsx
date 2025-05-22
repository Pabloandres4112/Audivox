import WaveformCanvas from "@Components/atomos/CanvaAnimation/WaveformCanvas";
import PlayerControls from "@Components/moleculas/PlayerControl/PlayerControls";
import Timeline from "@Components/moleculas/PlayerControl/Timeline";
import VolumeControl from "@Components/moleculas/PlayerControl/VolumeControl";
import { useRef, useState } from "react";
import LowPerformeCanva from "../../hook/LowPerformeCanva.tsx";

const ControlMusic = () => {

  const isLowPerformance = LowPerformeCanva();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContext) {
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      const analyserNode = context.createAnalyser();
      source.connect(analyserNode);
      analyserNode.connect(context.destination);
      setAudioContext(context);
      setAnalyser(analyserNode);
    }

    isPlaying ? audio.pause() : audio.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && !isSeeking) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration);
  };

  const handleSeekChange = (value: number) => {
    setSeekValue(value);
    setIsSeeking(true);
  };

  const handleSeekCommit = (value: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value;
      audio.play(); // retomar reproducción
      setCurrentTime(value);
    }
    setIsSeeking(false);
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
    <div className="w-full p-4 text-white rounded-2xl shadow-lg flex flex-col items-center md:items-start text-center md:text-left">
      <audio
        ref={audioRef}
        src="/music/GustarmeTanto.mp3"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {!isLowPerformance ? (
        <WaveformCanvas analyser={analyser} />
      ) : (
        <div className="w-full h-24 bg-gray-800 rounded-xl mb-4"></div>
      )}

      <div className="w-full">
        <Timeline
          currentTime={isSeeking ? seekValue : currentTime}
          duration={duration}
          onSeekChange={handleSeekChange}
          onSeekCommit={handleSeekCommit}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center md:justify-start w-full mt-4 gap-4">
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
