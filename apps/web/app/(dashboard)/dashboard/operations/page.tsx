import { ReceiptText } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function OperationsPage() {
  return (
    <EmptyState
      description="Invoices, quotes, expenses, and cash-flow workflows will live here once Operations Autopilot comes online."
      icon={ReceiptText}
      title="No operations activity yet"
    />
  );
}
