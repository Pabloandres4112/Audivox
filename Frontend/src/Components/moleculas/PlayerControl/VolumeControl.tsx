import VolumeIcon from "@Components/atomos/Icon/MenuMuic/VolumeIcon";


type VolumeControlProps = {
  volume: number;
  onChange: (value: number) => void;
};

const VolumeControl = ({ volume, onChange }: VolumeControlProps) => (
  <div className="flex items-center gap-2">
    <VolumeIcon />
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={volume}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="accent-purple-500"
    />
  </div>
);

export default VolumeControl;
