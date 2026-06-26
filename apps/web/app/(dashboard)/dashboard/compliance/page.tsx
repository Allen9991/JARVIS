import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function CompliancePage() {
  return (
    <EmptyState
      description="Compliance score, heat map, deadlines, and remediation steps will appear after the rules engine starts evaluating organisation data."
      icon={ShieldCheck}
      title="No compliance evaluations yet"
    />
  );
}
