import { useRef, useState } from "react";
import PlayerControls from "@Components/moleculas/PlayerControl/PlayerControls";
import Timeline from "@Components/moleculas/PlayerControl/Timeline";
import VolumeControl from "@Components/moleculas/PlayerControl/VolumeControl";

interface ControlMusicProps {
  setAnalyser: (node: AnalyserNode) => void;
  setAudioContext: (ctx: AudioContext) => void;
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
}

const ControlMusic: React.FC<ControlMusicProps> = ({
  setAnalyser,
  setAudioContext,
  audioContext,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [seekValue, setSeekValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const initializeAudioContext = () => {
    const audio = audioRef.current;
    if (!audio || audioContext) return;

    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyserNode = context.createAnalyser();

    source.connect(analyserNode);
    analyserNode.connect(context.destination);

    setAudioContext(context);
    setAnalyser(analyserNode);
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContext) initializeAudioContext();

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
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
    if (audio) {
      setDuration(audio.duration);
    }
  };

  const handleSeekChange = (value: number) => {
    setSeekValue(value);
    setIsSeeking(true);
  };

  const handleSeekCommit = (value: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = value;
      audio.play();
      setCurrentTime(value);
      setIsPlaying(true);
    }
    setIsSeeking(false);
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const handleForward = () => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(audio.currentTime + 10, duration);
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(audio.currentTime - 10, 0);
  };

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 rounded-2xl shadow-xl space-y-4 text-white">
      <audio
        ref={audioRef}
        src="/music/GustarmeTanto.mp3"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Timeline */}
      <Timeline
        currentTime={isSeeking ? seekValue : currentTime}
        duration={duration}
        onSeekChange={handleSeekChange}
        onSeekCommit={handleSeekCommit}
      />

      {/* Controls and Volume */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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
