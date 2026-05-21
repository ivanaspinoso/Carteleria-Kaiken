"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/sabores",   label: "Sabores",   emoji: "🍦" },
  { href: "/cafeteria", label: "Cafetería", emoji: "☕" },
  { href: "/postres",   label: "Postres",   emoji: "🍮" },
  { href: "/promos",    label: "Promos",    emoji: "🏷️" },
  { href: "/pantallas", label: "Pantallas", emoji: "📺" },
  { href: "/historial", label: "Historial", emoji: "📋" },
] as const;

interface Props {
  userEmail?: string;
}

export default function AdminNav({ userEmail }: Props) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-2xl">

        {/* Barra superior */}
        <div className="flex items-center justify-between h-12">
          {/* TODO: reemplazar emoji con logo real */}
          <span className="font-bold text-base select-none">🍦 Admin</span>

          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px]">
                {userEmail}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>

        {/* Tabs de navegación — mobile-first */}
        <nav className="flex overflow-x-auto gap-1 pb-2 scrollbar-none">
          {NAV_ITEMS.map(({ href, label, emoji }) => {
            const activo = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md
                  text-xs whitespace-nowrap transition-colors min-w-fit
                  ${activo
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }
                `}
              >
                <span className="text-sm">{emoji}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
