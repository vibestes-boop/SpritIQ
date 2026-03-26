"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, BookOpen, Settings } from "lucide-react";

const tabs = [
  { href: "/",           label: "Home",        Icon: Home      },
  { href: "/karte",      label: "Karte",       Icon: Map       },
  { href: "/briefing",   label: "Briefing",    Icon: BookOpen  },
  { href: "/einstellungen", label: "Einstellungen", Icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10,10,15,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid #1E1E2E",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Hauptnavigation"
    >
      <div className="flex items-center justify-around h-[64px] max-w-lg mx-auto px-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] cursor-pointer group"
              aria-current={active ? "page" : undefined}
            >
              <div
                className="p-1.5 rounded-xl transition-all duration-200"
                style={{
                  background: active ? "rgba(34,197,94,0.12)" : "transparent",
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{
                    color: active ? "#22C55E" : "#64748B",
                    transition: "color 200ms ease",
                  }}
                />
              </div>
              <span
                className="text-[10px] font-medium leading-none transition-colors duration-200"
                style={{ color: active ? "#22C55E" : "#64748B" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
