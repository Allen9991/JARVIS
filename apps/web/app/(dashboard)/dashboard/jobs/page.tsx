import { HardHat } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function JobsPage() {
  return (
    <EmptyState
      description="Upcoming and active trade jobs will be listed here with address, scope, assigned workers, and compliance documents."
      icon={HardHat}
      title="No jobs yet"
    />
  );
}
