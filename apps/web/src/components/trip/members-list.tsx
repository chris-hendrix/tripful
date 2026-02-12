"use client";

import { UserPlus, Phone, X, Users } from "lucide-react";
import { useMembers, useInvitations } from "@/hooks/use-invitations";
import type { MemberWithProfile, Invitation } from "@/hooks/use-invitations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RsvpBadge } from "@/components/ui/rsvp-badge";
import { getInitials, formatPhoneNumber } from "@/lib/format";

interface MembersListProps {
  tripId: string;
  isOrganizer: boolean;
  onInvite?: () => void;
  onRemove?: (member: MemberWithProfile, invitationId: string) => void;
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

export function MembersList({
  tripId,
  isOrganizer,
  onInvite,
  onRemove,
}: MembersListProps) {
  const { data: members, isPending } = useMembers(tripId);
  const { data: invitations } = useInvitations(tripId, {
    enabled: isOrganizer,
  });

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

  if (isPending) {
    return <MembersListSkeleton />;
  }

  if (!members || members.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No members yet</p>
        </div>
        {isOrganizer && onInvite && (
          <div className="mt-auto pt-4 border-t border-border">
            <Button
              onClick={onInvite}
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-input hover:bg-secondary"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite members
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 divide-y divide-border">
        {members.map((member) => {
          const invitation = isOrganizer
            ? findInvitationForMember(member, invitations)
            : undefined;
          const canRemove = isOrganizer && !!invitation && !!onRemove;

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
                  <RsvpBadge status={member.status} />
                </div>
                {member.handles && Object.keys(member.handles).length > 0 && (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {member.handles.venmo && (
                      <a
                        href={`https://venmo.com/${member.handles.venmo.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                        data-testid={`member-venmo-${member.userId}`}
                      >
                        Venmo
                      </a>
                    )}
                    {member.handles.instagram && (
                      <a
                        href={`https://instagram.com/${member.handles.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                        data-testid={`member-instagram-${member.userId}`}
                      >
                        Instagram
                      </a>
                    )}
                  </div>
                )}
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
                  onClick={() => onRemove(member, invitation.id)}
                  aria-label={`Remove ${member.displayName}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {isOrganizer && onInvite && (
        <div className="mt-auto pt-4 border-t border-border">
          <Button
            onClick={onInvite}
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl border-input hover:bg-secondary"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite
          </Button>
        </div>
      )}
    </div>
  );
}
