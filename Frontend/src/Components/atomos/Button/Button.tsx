type ButtonProps = {
  label: string;
  onClick: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
};

export default function Button({ label, onClick, type = "button", className = "" }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        px-4 py-2 rounded-2xl text-white font-medium
        bg-gradient-to-br from-purple-600 to-indigo-700
        hover:brightness-110 active:scale-95 transition-all
        shadow-md backdrop-blur-sm border border-white/10
        ${className}
      `}
    >
      {label}
    </button>
  );
}
