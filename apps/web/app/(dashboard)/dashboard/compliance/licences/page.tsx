import { BadgeCheck } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function LicencesPage() {
  return (
    <EmptyState
      description="No licences added yet. Team licences, expiry dates, and CPD status will appear here once licence data is available."
      icon={BadgeCheck}
      title="No licences added yet"
    />
  );
}
