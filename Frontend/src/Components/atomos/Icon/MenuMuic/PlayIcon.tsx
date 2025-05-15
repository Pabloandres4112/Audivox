const PlayIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24" className={className}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

export default PlayIcon;

