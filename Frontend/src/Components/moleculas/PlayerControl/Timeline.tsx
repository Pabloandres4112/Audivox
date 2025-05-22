type TimelineProps = {
  currentTime: number;
  duration: number;
  onSeekChange: (time: number) => void;
  onSeekCommit: (time: number) => void;
};

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const Timeline = ({ currentTime, duration, onSeekChange, onSeekCommit }: TimelineProps) => (
  <div className="w-full">
    <input
      type="range"
      min="0"
      max={duration}
      step="0.01"
      value={currentTime}
      onChange={(e) => onSeekChange(parseFloat(e.target.value))}
      onMouseUp={(e) => onSeekCommit(parseFloat(e.currentTarget.value))}
      onTouchEnd={(e) => onSeekCommit(parseFloat(e.currentTarget.value))}
      className="w-full accent-purple-500"
    />
    <div className="flex justify-between text-sm text-gray-400">
      <span>{formatTime(currentTime)}</span>
      <span>{formatTime(duration)}</span>
    </div>
  </div>
);

export default Timeline;
