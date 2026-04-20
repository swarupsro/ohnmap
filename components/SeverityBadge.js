import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { normalizeSeverity, SEVERITY_STYLES } from "@/utils/severityMapper";

export default function SeverityBadge({ severity, className }) {
  const normalized = normalizeSeverity(severity);
  return (
    <Badge variant="outline" className={cn("min-w-16 justify-center", SEVERITY_STYLES[normalized], className)}>
      {normalized}
    </Badge>
  );
}
