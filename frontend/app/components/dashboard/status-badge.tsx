import { Badge } from "@/app/components/ui/badge";
import type { InquiryStatus } from "@/app/lib/types";

/* Sky Blue for work waiting, Warm Yellow for work in progress, muted for done —
   the same three tones the dashboard status bar uses, so the two read as one
   system. */
const TONE = {
  new: "accent",
  contacted: "highlight",
  closed: "muted",
} as const;

export function StatusBadge({ status }: { status: InquiryStatus }) {
  return <Badge tone={TONE[status]}>{status}</Badge>;
}
