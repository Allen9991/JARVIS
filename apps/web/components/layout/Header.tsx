import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { signOut } from "@/app/(dashboard)/dashboard/actions";

type HeaderProps = {
  user: {
    avatarUrl?: string;
    email?: string;
    name?: string;
  };
};

const orgName = "Kiwi Spark Electrical Ltd";

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.split("@")[0] || "Atlas";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function Header({ user }: HeaderProps) {
  const initials = getInitials(user.name, user.email);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-h-12 items-center justify-between gap-4">
        <div className="hidden min-w-0 sm:block">
          <p className="text-sm text-muted-foreground">Organisation</p>
          <p className="truncate font-semibold">{orgName}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open user menu"
              className="rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Avatar>
                <AvatarImage
                  alt={user.name ? `${user.name} profile image` : ""}
                  src={user.avatarUrl}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                {user.name ?? user.email ?? "Atlas user"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form action={signOut} className="px-1">
                <button
                  className="flex min-h-10 w-full items-center gap-2 rounded-sm px-2 text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10"
                  type="submit"
                >
                  <LogOut aria-hidden className="size-4" />
                  Sign out
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
