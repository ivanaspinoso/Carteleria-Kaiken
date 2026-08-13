"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IceCream, Coffee, Cake, Tag, Monitor, History, Images, type LucideIcon } from "lucide-react";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  // Las tres horizontales (P2, P3, P4) se numeran para que se vea de una cuál
  // TV toca cada pestaña: las tres pueden mostrar una imagen subida a mano.
  { href: "/sabores",   label: "P2 - Sabores",   Icon: IceCream },
  { href: "/postres",   label: "P3 - Postres",   Icon: Cake     },
  { href: "/cafeteria", label: "P4 - Cafetería", Icon: Coffee   },
  { href: "/promos",    label: "Promos",    Icon: Tag       },
  { href: "/placas",    label: "Placas",    Icon: Images    },
  { href: "/pantallas", label: "Pantallas", Icon: Monitor   },
  { href: "/historial", label: "Historial", Icon: History   },
];

interface Props {
  userEmail?: string;
}

export default function AdminNav({ userEmail }: Props) {
  const pathname = usePathname();
  const inicial = userEmail?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-50">
      <div className="mx-auto px-5 max-w-4xl">

        {/* Barra superior */}
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kaikenlogocompletoverde.PNG"
            alt="Kaiken"
            className="h-11 w-auto object-contain select-none"
            style={{ mixBlendMode: "multiply" }}
          />

          {/* Usuario + salir */}
          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-primary leading-none">{inicial}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {userEmail}
                </span>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>

        {/* Tabs de navegación con íconos Lucide */}
        <nav className="flex gap-1 overflow-x-auto pb-3 scrollbar-none">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const activo = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2 rounded-lg
                  text-xs font-medium whitespace-nowrap transition-all select-none min-w-fit
                  ${activo
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }
                `}
              >
                <Icon size={13} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
