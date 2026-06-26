import { Activity, ClipboardCheck, Mail, Wrench } from "lucide-react";

const cards = [
  {
    title: "Inbox",
    description: "Email triage and draft replies will appear here.",
    icon: Mail
  },
  {
    title: "Compliance",
    description: "Your compliance score and upcoming actions will appear here.",
    icon: ClipboardCheck
  },
  {
    title: "Jobs",
    description: "Job activity, assignments, and safety documents will appear here.",
    icon: Wrench
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Atlas is ready for the foundation flows: auth, tenancy, and audit-aware
          actions.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <article className="rounded-md border bg-background p-5" key={card.title}>
            <card.icon aria-hidden className="mb-4 size-6 text-primary" />
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {card.description}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-md border bg-background p-5">
        <div className="flex items-center gap-3">
          <Activity aria-hidden className="size-5 text-primary" />
          <h2 className="font-semibold">No activity yet</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Once signups, invites, jobs, and compliance checks are wired to the
          audit helper, recent activity will show here.
        </p>
      </section>
    </div>
  );
}
