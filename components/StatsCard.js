"use client";

import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, icon: Icon, detail, tone = "default", active = false, onClick }) {
  const tones = {
    default: "bg-primary/10 text-primary",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    teal: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    gray: "bg-slate-500/10 text-slate-600 dark:text-slate-300"
  };

  const Wrapper = onClick ? motion.button : motion.div;
  const wrapperProps = onClick ? { type: "button", onClick } : {};

  return (
    <Wrapper
      {...wrapperProps}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn("h-full w-full text-left", onClick && "focus-ring rounded-lg")}
    >
      <Card
        className={cn(
          "h-full overflow-hidden transition-colors",
          onClick && "hover:border-primary/50 hover:bg-muted/30",
          active && "border-primary bg-primary/10"
        )}
      >
        <CardContent className="flex min-h-28 items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
            {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
          </div>
          {Icon ? (
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Wrapper>
  );
}
