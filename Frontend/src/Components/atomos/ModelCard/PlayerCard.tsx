export default function PlayerCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-6xl mx-auto mt-12 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1F1C2C] via-[#232526] to-[#0F2027] p-6 shadow-xl backdrop-blur-xl border border-white/10">
      <div className="absolute inset-0 bg-white/5 backdrop-blur-lg rounded-2xl pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}