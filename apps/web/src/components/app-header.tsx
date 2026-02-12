"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/app/providers/auth-provider";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";
import { getUploadUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ProfileDialog = dynamic(
  () =>
    import("@/components/profile/profile-dialog").then((mod) => ({
      default: mod.ProfileDialog,
    })),
  { ssr: false },
);

const preloadProfileDialog = () =>
  void import("@/components/profile/profile-dialog");

function UserAvatar({
  user,
}: {
  user: { displayName: string; profilePhotoUrl?: string | null } | null;
}) {
  return (
    <Avatar size="sm">
      {user?.profilePhotoUrl && (
        <AvatarImage
          src={getUploadUrl(user.profilePhotoUrl)}
          alt={user.displayName}
        />
      )}
      <AvatarFallback>
        {user ? getInitials(user.displayName) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/trips"
              className="font-[family-name:var(--font-playfair)] text-xl font-bold tracking-tight"
            >
              Tripful
            </Link>

            <nav aria-label="Main navigation">
              <Link
                href="/trips"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground/80",
                  pathname.startsWith("/trips")
                    ? "text-foreground"
                    : "text-foreground/60",
                )}
              >
                My Trips
              </Link>
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="User menu"
                onMouseEnter={preloadProfileDialog}
                onFocus={preloadProfileDialog}
              >
                <UserAvatar user={user} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {user && (
                <>
                  <DropdownMenuItem
                    onSelect={() => setProfileDialogOpen(true)}
                    onMouseEnter={preloadProfileDialog}
                    onFocus={preloadProfileDialog}
                    className="flex flex-col items-start gap-0"
                    data-testid="profile-menu-item"
                  >
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.phoneNumber}
                    </p>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={logout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </>
  );
}
