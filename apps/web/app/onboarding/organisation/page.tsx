import { redirect } from "next/navigation";

import { Button } from "@atlas/ui";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OrganisationOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/onboarding/organisation");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            Create your organisation
          </h1>
          <p className="text-sm text-muted-foreground">
            This creates the tenant workspace Atlas will use for jobs,
            compliance, documents, and operations.
          </p>
        </div>

        <form className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            <span>Business name</span>
            <input
              className="h-12 w-full rounded-md border border-input bg-background px-3"
              name="name"
              placeholder="Auckland Electrical Co"
              required
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Jurisdiction</span>
            <select
              className="h-12 w-full rounded-md border border-input bg-background px-3"
              defaultValue="nz"
              name="jurisdiction"
            >
              <option value="nz">New Zealand</option>
              <option value="au">Australia</option>
            </select>
          </label>
          <Button disabled type="submit">
            Create organisation
          </Button>
        </form>
      </section>
    </main>
  );
}
