import { redirect } from "next/navigation";

import { CreateOrgForm } from "@/components/org/CreateOrgForm";
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

        <CreateOrgForm />
      </section>
    </main>
  );
}
