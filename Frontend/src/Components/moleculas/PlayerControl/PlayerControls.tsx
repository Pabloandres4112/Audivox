import {Forward5Icon, PauseIcon, PlayIcon, Rewind5Icon} from "@Components/atomos/index.ts";

type PlayerControlsProps = {
  isPlaying: boolean;
  onPlayPause: () => void;
  onForward: () => void;
  onRewind: () => void;
};

const PlayerControls = ({ isPlaying, onPlayPause, onForward, onRewind }: PlayerControlsProps) => (
  <div className="flex items-center justify-center gap-6">
    <button onClick={onRewind}>
      <Rewind5Icon />
    </button>

    <button
      onClick={onPlayPause}
      className="bg-white text-black rounded-full p-3 shadow-lg"
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </button>

    <button onClick={onForward}>
      <Forward5Icon />
    </button>
  </div>
);

export default PlayerControls;
