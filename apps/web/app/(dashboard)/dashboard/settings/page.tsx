import { Settings } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function SettingsPage() {
  return (
    <EmptyState
      description="Business profile, team, integrations, billing, and organisation settings will be managed here."
      icon={Settings}
      title="Settings are ready"
    />
  );
}
