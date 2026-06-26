import { Settings } from "lucide-react";

import { InviteUserForm } from "@/components/org/InviteUserForm";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex size-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Settings aria-hidden className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Business profile, team, integrations, billing, and organisation
          settings will be managed here.
        </p>
      </section>

      <section className="rounded-md border bg-background p-5">
        <div className="mb-5 space-y-1">
          <h2 className="text-lg font-semibold tracking-normal">Team invites</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Invite administrators or members into the current organisation.
          </p>
        </div>
        <div className="max-w-md">
          <InviteUserForm />
        </div>
      </section>
    </div>
  );
}
