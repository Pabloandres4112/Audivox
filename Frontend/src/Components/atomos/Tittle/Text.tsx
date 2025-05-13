type TitleProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const Text = ({ children, className = "", style = {} }: TitleProps) => (
  <h2 className={className} 
  style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, ...style }}>
    {children}
  </h2>
);
