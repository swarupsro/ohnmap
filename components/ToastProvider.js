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
                className="relative overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-soft"
              >
                <div className="flex gap-3 p-4">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-1",
                      item.variant === "error" && "bg-destructive",
                      item.variant === "success" && "bg-success",
                      item.variant === "info" && "bg-primary"
                    )}
                  />
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      item.variant === "error" && "text-destructive",
                      item.variant === "success" && "text-success",
                      item.variant === "info" && "text-primary"
                    )}
                  />
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
