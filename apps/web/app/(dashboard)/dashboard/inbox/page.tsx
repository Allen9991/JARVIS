import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function InboxPage() {
  return (
    <EmptyState
      description="Connected Gmail and Outlook messages will be classified here for priority, urgency, and required replies."
      icon={Inbox}
      title="Inbox is empty"
    />
  );
}
