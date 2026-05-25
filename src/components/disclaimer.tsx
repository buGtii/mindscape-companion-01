import { AlertTriangle } from "lucide-react";
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-border/60 bg-muted/50 p-4 text-xs text-muted-foreground ${className}`}>

      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
      <p>
        <strong className="text-foreground">Educational only.</strong> Lumen summarizes DSM-5-TR concepts for learning and reference.
        It does not provide medical diagnosis. If you are in crisis, contact local emergency services or a licensed clinician.
      </p>
    </div>
  );
}
