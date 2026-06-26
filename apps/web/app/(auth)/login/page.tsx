import Link from "next/link";

import { Button } from "@atlas/ui";

import {
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword
} from "../actions";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = first(params.error);
  const message = first(params.message);
  const redirectTo = first(params.redirectTo) ?? "/dashboard";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-xs space-y-6 sm:max-w-md">
        <div className="space-y-2">
          <h1 className="break-words text-3xl font-semibold tracking-normal">
            Sign in
          </h1>
          <p className="break-words text-sm text-muted-foreground">
            Open Atlas and get back to the work that needs your attention.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            {message}
          </p>
        ) : null}

        <form action={signInWithPassword} className="space-y-4">
          <input name="redirectTo" type="hidden" value={redirectTo} />
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
              name="password"
              required
              type="password"
            />
          </label>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>

        <div className="grid gap-3">
          <form action={sendMagicLink}>
            <input name="redirectTo" type="hidden" value={redirectTo} />
            <label className="sr-only" htmlFor="magic-email">
              Email for magic link
            </label>
            <input
              className="mb-3 h-12 w-full rounded-md border border-input bg-background px-3"
              id="magic-email"
              name="email"
              placeholder="Email for magic link"
              required
              type="email"
            />
            <Button className="w-full" type="submit" variant="outline">
              Send magic link
            </Button>
          </form>
          <form action={signInWithGoogle}>
            <input name="redirectTo" type="hidden" value={redirectTo} />
            <Button className="w-full" type="submit" variant="outline">
              Continue with Google
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          New to Atlas?{" "}
          <Link className="font-medium text-primary" href="/signup">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
