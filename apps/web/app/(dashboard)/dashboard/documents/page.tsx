import { FileText } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";

export default function DocumentsPage() {
  return (
    <EmptyState
      description="Uploaded documents, generated PDFs, templates, and indexed knowledge files will appear here."
      icon={FileText}
      title="No documents yet"
    />
  );
}
