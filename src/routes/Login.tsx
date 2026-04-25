import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Building2, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const BANKS = [
  { id: "A7F3", label: "Bank A" },
  { id: "B2C9", label: "Bank B" },
  { id: "C13E", label: "Bank C" },
  { id: "D5A1", label: "Bank D" },
  { id: "E8B0", label: "Bank E" },
  { id: "F0DD", label: "Bank F" },
];

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);

  function handlePick(bank: { id: string; label: string }) {
    setSession({ anonymousId: bank.id, bankLabel: bank.label });
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="grid-bg min-h-full">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center gap-3 text-brand-300">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-widest uppercase">SecureShare</span>
        </header>

        <div className="mt-12 grid gap-12 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-4xl font-semibold leading-tight text-slate-100">
              Sign in <span className="text-brand-400">privately</span>.
              <br />
              Defend collectively.
            </h1>
            <p className="mt-4 max-w-md text-slate-400">
              Production will use a zero-knowledge group-membership proof. For now,
              pick a demo identity to enter the dashboard.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-brand-400" />
                No identity is exposed to the network.
              </li>
              <li className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-brand-400" />
                Credibility binds to a nullifier, not an organization name.
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur"
          >
            <h2 className="text-sm font-semibold tracking-wide text-slate-100">
              Demo identities
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Pre-distributed test credentials for six fictional banks.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {BANKS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handlePick(b)}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4",
                    "transition hover:border-brand-500/50 hover:bg-slate-900",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                  )}
                >
                  <Building2 className="h-7 w-7 text-brand-300 transition group-hover:text-brand-400" />
                  <span className="text-xs font-medium text-slate-200">{b.label}</span>
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              className="mt-6 w-full justify-center"
              onClick={() => handlePick(BANKS[0]!)}
            >
              Demo shortcut · sign in as Bank A
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
