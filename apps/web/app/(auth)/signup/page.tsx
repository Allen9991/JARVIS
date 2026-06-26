import Link from "next/link";

import { Button } from "@atlas/ui";

import { signInWithGoogle, signUpWithPassword } from "../actions";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = first(params.error);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-xs space-y-6 sm:max-w-md">
        <div className="space-y-2">
          <h1 className="break-words text-3xl font-semibold tracking-normal">
            Create your Atlas account
          </h1>
          <p className="break-words text-sm text-muted-foreground">
            Start with an owner account, then set up the business workspace.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <form action={signUpWithPassword} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            <span>Email</span>
            <input
              className="h-12 w-full rounded-md border border-input bg-background px-3"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Password</span>
            <input
              className="h-12 w-full rounded-md border border-input bg-background px-3"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <Button className="w-full" type="submit">
            Sign up
          </Button>
        </form>

        <form action={signInWithGoogle}>
          <Button className="w-full" type="submit" variant="outline">
            Continue with Google
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-medium text-primary" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
