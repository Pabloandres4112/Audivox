type TitleProps = {
  children: React.ReactNode;
};

export const Title = ({ children }: TitleProps) => (
  <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>
    {children}
  </h2>
);
