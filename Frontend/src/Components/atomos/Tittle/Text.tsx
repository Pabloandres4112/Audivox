type TitleProps = {
  children: React.ReactNode;
};

export const Text = ({ children }: TitleProps) => (
  <h2 className="text-xl font-semibold text-white tracking-tight">
    {children}
  </h2>
);
