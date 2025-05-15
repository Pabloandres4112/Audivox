const VolumeIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M7 10v4h3l4 4V6l-4 4H7z" />
  </svg>
);

export default VolumeIcon;
