import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BriefcaseBusiness,
  FileText,
  HardHat,
  Inbox,
  ReceiptText,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const navItems = [
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/dashboard/jobs", label: "Jobs", icon: HardHat },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/operations", label: "Operations", icon: ReceiptText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  const displayName = user.user_metadata.name as string | undefined;
  const avatarUrl = user.user_metadata.avatar_url as string | undefined;

  return (
    <div className="min-h-dvh bg-muted/30">
      <Header
        user={{
          avatarUrl,
          email: user.email,
          name: displayName,
        }}
      />

      <aside className="fixed bottom-0 left-0 top-[73px] hidden w-64 border-r bg-background p-4 md:block">
        <Link className="mb-8 flex items-center gap-3" href="/dashboard">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BriefcaseBusiness aria-hidden className="size-5" />
          </span>
          <span className="text-lg font-semibold">Atlas AI</span>
        </Link>
        <nav aria-label="Main" className="space-y-1">
          {navItems.map((item) => (
            <Link
              className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              <item.icon aria-hidden className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="md:pl-64">
        <nav
          aria-label="Mobile main"
          className="flex gap-2 overflow-x-auto border-b bg-background px-4 py-3 md:hidden"
        >
          {navItems.map((item) => (
            <Link
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium"
              href={item.href}
              key={item.href}
            >
              <item.icon aria-hidden className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
