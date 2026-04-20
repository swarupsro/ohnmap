"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, createStableId } from "@/lib/utils";

const ToastContext = createContext({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "info", duration = 4600 }) => {
      const id = createStableId("toast", `${title}:${description}:${Date.now()}:${Math.random()}`);
      setToasts((current) => [...current, { id, title, description, variant }].slice(-4));
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((item) => {
            const Icon = item.variant === "success" ? CheckCircle2 : item.variant === "error" ? AlertCircle : Info;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  "rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg",
                  item.variant === "error" && "border-destructive/40",
                  item.variant === "success" && "border-primary/40"
                )}
              >
                <div className="flex gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dismiss(item.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
