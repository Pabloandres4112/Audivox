const Rewind5Icon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Triángulos invertidos */}
    <polygon points="20 4, 10 12, 20 20" /> {/* Primer triángulo */}
    <polygon points="14 4, 4 12, 14 20" /> {/* Segundo triángulo */}

    {/* Texto “5” al lado */}
    <text
      x="1"
      y="16"
      fontSize="8"
      fill="white"
      fontWeight="bold"
    >
      5
    </text>
  </svg>
);

export default Rewind5Icon;
