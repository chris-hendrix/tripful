"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/app/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="font-[family-name:var(--font-playfair)] text-xl font-bold tracking-tight"
          >
            Tripful
          </Link>

          <nav aria-label="Main navigation">
            <Link
              href="/dashboard"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground/80",
                pathname === "/dashboard"
                  ? "text-foreground"
                  : "text-foreground/60",
              )}
            >
              Dashboard
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
            >
              <Avatar size="sm">
                {user?.profilePhotoUrl && (
                  <AvatarImage
                    src={user.profilePhotoUrl}
                    alt={user.displayName}
                  />
                )}
                <AvatarFallback>
                  {user ? getInitials(user.displayName) : "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {user && (
              <>
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.phoneNumber}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
