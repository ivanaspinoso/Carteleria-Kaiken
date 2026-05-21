// Layout fullscreen para las carteleras — sin nav, sin scroll, sin controles
export default function PantallaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "fixed",
        inset: 0,
      }}
    >
      {children}
    </div>
  );
}
