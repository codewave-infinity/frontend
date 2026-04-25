import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ShieldCheck, Activity, Settings, LogOut, BadgeCheck } from "lucide-react";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Live Network", icon: Activity },
  { to: "/admin", label: "Admin", icon: Settings },
];

export default function DashboardLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="grid min-h-full grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r border-slate-800/80 bg-slate-950/60 backdrop-blur">
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 text-brand-300">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-widest uppercase">SecureShare</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  "transition",
                  isActive
                    ? "bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-800/80 p-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <BadgeCheck className="h-3.5 w-3.5 text-brand-400" />
              {session ? `${session.bankLabel} · #${session.anonymousId}` : "—"}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">anonymous session</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
