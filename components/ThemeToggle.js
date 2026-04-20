"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ThemeToggle({ theme, onChange }) {
  const isDark = theme === "dark";
  return (
    <Button variant="outline" size="icon" onClick={() => onChange(isDark ? "light" : "dark")} aria-label="Toggle theme">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
