"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Phone, X, Users } from "lucide-react";
import {
  useMembers,
  useInvitations,
  useRevokeInvitation,
  getRevokeInvitationErrorMessage,
} from "@/hooks/use-invitations";
import type { MemberWithProfile, Invitation } from "@/hooks/use-invitations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInitials, formatPhoneNumber } from "@/lib/format";

interface MembersListProps {
  tripId: string;
  isOrganizer: boolean;
  onInvite?: () => void;
}

function getRsvpBadge(status: MemberWithProfile["status"]) {
  switch (status) {
    case "going":
      return (
        <Badge className="bg-success/15 text-success border-success/30">
          Going
        </Badge>
      );
    case "maybe":
      return (
        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">
          Maybe
        </Badge>
      );
    case "not_going":
      return (
        <Badge className="bg-destructive/15 text-destructive border-destructive/30">
          Not Going
        </Badge>
      );
    case "no_response":
      return (
        <Badge className="bg-muted text-muted-foreground border-border">
          No Response
        </Badge>
      );
  }
}

function MembersListSkeleton() {
  return (
    <div className="space-y-4" data-testid="members-list-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MembersList({ tripId, isOrganizer, onInvite }: MembersListProps) {
  const { data: members, isPending } = useMembers(tripId);
  const { data: invitations } = useInvitations(tripId);
  const revokeInvitation = useRevokeInvitation(tripId);

  const [removingMember, setRemovingMember] = useState<MemberWithProfile | null>(null);

  // Find the invitation record for a member by matching phone numbers
  function findInvitationForMember(
    member: MemberWithProfile,
    invitationsList: Invitation[] | undefined,
  ): Invitation | undefined {
    if (!invitationsList || !member.phoneNumber) return undefined;
    return invitationsList.find(
      (inv) => inv.inviteePhone === member.phoneNumber,
    );
  }

  function handleRemoveMember() {
    if (!removingMember || !invitations) return;

    const invitation = findInvitationForMember(removingMember, invitations);
    if (!invitation) return;

    revokeInvitation.mutate(invitation.id, {
      onSuccess: () => {
        toast.success(`${removingMember.displayName} has been removed`);
        setRemovingMember(null);
      },
      onError: (error) => {
        const message = getRevokeInvitationErrorMessage(error);
        toast.error(message ?? "Failed to remove member");
        setRemovingMember(null);
      },
    });
  }

  if (isPending) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 font-[family-name:var(--font-playfair)]">
          Members
        </h3>
        <MembersListSkeleton />
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 font-[family-name:var(--font-playfair)]">
          Members
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No members yet</p>
          {isOrganizer && onInvite && (
            <Button
              onClick={onInvite}
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-input hover:bg-secondary"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite members
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground font-[family-name:var(--font-playfair)]">
          Members ({members.length})
        </h3>
        {isOrganizer && onInvite && (
          <Button
            onClick={onInvite}
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl border-input hover:bg-secondary"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        )}
      </div>

      <div className="divide-y divide-border">
        {members.map((member) => {
          const invitation = isOrganizer
            ? findInvitationForMember(member, invitations)
            : undefined;
          const canRemove = isOrganizer && !!invitation;

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Avatar size="default">
                <AvatarImage
                  src={member.profilePhotoUrl ?? undefined}
                  alt={member.displayName}
                />
                <AvatarFallback>
                  {getInitials(member.displayName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">
                    {member.displayName}
                  </span>
                  {member.isOrganizer && (
                    <Badge className="bg-gradient-to-r from-primary to-accent text-white">
                      Organizer
                    </Badge>
                  )}
                  {getRsvpBadge(member.status)}
                </div>
                {isOrganizer && member.phoneNumber && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatPhoneNumber(member.phoneNumber)}
                    </span>
                  </div>
                )}
              </div>

              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setRemovingMember(member)}
                  aria-label={`Remove ${member.displayName}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Remove member confirmation dialog */}
      <AlertDialog
        open={!!removingMember}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-medium text-foreground">
                {removingMember?.displayName}
              </span>{" "}
              from this trip? This will revoke their invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeInvitation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={revokeInvitation.isPending}
            >
              {revokeInvitation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
