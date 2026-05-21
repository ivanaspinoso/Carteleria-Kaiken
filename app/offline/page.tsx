export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl">📡</p>
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="text-muted-foreground text-sm max-w-xs">
        No hay internet disponible. Los cambios que hagas no se guardarán hasta que te reconectes.
      </p>
      <a
        href="/sabores"
        className="mt-2 text-sm font-medium underline underline-offset-4"
      >
        Reintentar
      </a>
    </div>
  );
}
