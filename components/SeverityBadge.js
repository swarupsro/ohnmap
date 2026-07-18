import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizeSeverity, SEVERITY_DOT_COLORS, SEVERITY_STYLES } from "@/utils/severityMapper";

export default function SeverityBadge({ severity, className }) {
  const normalized = normalizeSeverity(severity);
  return (
    <Badge
      variant="outline"
      className={cn("min-w-20 justify-center gap-1.5 border-transparent font-medium", SEVERITY_STYLES[normalized], className)}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", SEVERITY_DOT_COLORS[normalized])} />
      {normalized}
    </Badge>
  );
}
