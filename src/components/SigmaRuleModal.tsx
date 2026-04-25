import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy } from "lucide-react";
import { toast } from "sonner";

export function SigmaRuleModal({
  open,
  onClose,
  ruleId,
  yaml,
}: {
  open: boolean;
  onClose: () => void;
  ruleId: string;
  yaml: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-brand-400">Sigma Rule</div>
                <div className="font-mono text-sm text-slate-200">{ruleId}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  onClick={() => {
                    navigator.clipboard.writeText(yaml);
                    toast.success("Sigma YAML copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <pre className="max-h-[60vh] overflow-auto bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-200">
              {yaml}
            </pre>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
