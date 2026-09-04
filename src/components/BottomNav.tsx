import { Link } from "@tanstack/react-router";
import { History, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Scan", icon: ScanLine },
  { to: "/history", label: "History", icon: History },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md border-t border-border bg-card/95 backdrop-blur">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
          activeOptions={{ exact: to === "/" }}
          activeProps={{ className: "text-primary" }}
        >
          {({ isActive }) => (
            <>
              <Icon className={cn("size-5", isActive && "text-primary")} />
              {label}
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}
