import { FileSearch } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function EmptyState({ title = "No results", message = "Adjust filters or upload another scan.", className, action }) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileSearch className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
