"use client";

import { useState } from "react";
import {
  UserPlus,
  Phone,
  Users,
  EllipsisVertical,
  ShieldCheck,
  ShieldOff,
  UserMinus,
  VolumeX,
  Volume2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useMembers } from "@/hooks/use-invitations";
import type { MemberWithProfile } from "@/hooks/use-invitations";
import {
  useMuteMember,
  useUnmuteMember,
  getMuteMemberErrorMessage,
  getUnmuteMemberErrorMessage,
} from "@/hooks/use-messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { RsvpBadge } from "@/components/ui/rsvp-badge";
import { VenmoIcon } from "@/components/icons/venmo-icon";
import { getInitials, formatPhoneNumber } from "@/lib/format";
import { getUploadUrl } from "@/lib/api";

interface MembersListProps {
  tripId: string;
  isOrganizer: boolean;
  createdBy?: string;
  currentUserId?: string | undefined;
  onInvite?: () => void;
  onRemove?: (member: MemberWithProfile) => void;
  onUpdateRole?: (member: MemberWithProfile, isOrganizer: boolean) => void;
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
  createdBy,
  currentUserId,
  onInvite,
  onRemove,
  onUpdateRole,
}: MembersListProps) {
  const { data: members, isPending } = useMembers(tripId);
  const [mutingMember, setMutingMember] = useState<MemberWithProfile | null>(
    null,
  );
  const muteMember = useMuteMember(tripId);
  const unmuteMember = useUnmuteMember(tripId);

  const handleMute = async () => {
    if (!mutingMember) return;
    try {
      await muteMember.mutateAsync(mutingMember.userId);
      toast.success(`${mutingMember.displayName} has been muted`);
    } catch (error) {
      const msg = getMuteMemberErrorMessage(error as Error);
      toast.error(msg ?? "Failed to mute member");
    } finally {
      setMutingMember(null);
    }
  };

  const handleUnmute = async (member: MemberWithProfile) => {
    try {
      await unmuteMember.mutateAsync(member.userId);
      toast.success(`${member.displayName} has been unmuted`);
    } catch (error) {
      const msg = getUnmuteMemberErrorMessage(error as Error);
      toast.error(msg ?? "Failed to unmute member");
    }
  };

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
          const canRemove =
            isOrganizer &&
            !!onRemove &&
            member.userId !== createdBy;

          const canUpdateRole =
            !!onUpdateRole &&
            member.userId !== createdBy &&
            member.userId !== currentUserId;

          const canMute =
            isOrganizer &&
            !member.isOrganizer &&
            member.userId !== createdBy;

          const showActions =
            isOrganizer && (canRemove || canUpdateRole || canMute);

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 py-3"
            >
              <Avatar size="default">
                <AvatarImage
                  src={getUploadUrl(member.profilePhotoUrl)}
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
                  {member.isMuted && (
                    <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30">
                      <VolumeX className="w-3 h-3 mr-1" />
                      Muted
                    </Badge>
                  )}
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
                        <VenmoIcon className="w-4 h-4" />
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
                {member.phoneNumber && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatPhoneNumber(member.phoneNumber)}
                    </span>
                  </div>
                )}
              </div>

              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      aria-label={`Actions for ${member.displayName}`}
                    >
                      <EllipsisVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canUpdateRole && !member.isOrganizer && (
                      <DropdownMenuItem
                        onSelect={() => onUpdateRole(member, true)}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Make co-organizer
                      </DropdownMenuItem>
                    )}
                    {canUpdateRole && member.isOrganizer && (
                      <DropdownMenuItem
                        onSelect={() => onUpdateRole(member, false)}
                      >
                        <ShieldOff className="w-4 h-4" />
                        Remove co-organizer
                      </DropdownMenuItem>
                    )}
                    {canMute && canUpdateRole && (
                      <DropdownMenuSeparator />
                    )}
                    {canMute && (
                      <>
                        {member.isMuted ? (
                          <DropdownMenuItem
                            onSelect={() => handleUnmute(member)}
                          >
                            <Volume2 className="w-4 h-4" />
                            Unmute
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => setMutingMember(member)}
                          >
                            <VolumeX className="w-4 h-4" />
                            Mute
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {canRemove && (canUpdateRole || canMute) && (
                      <DropdownMenuSeparator />
                    )}
                    {canRemove && (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => onRemove!(member)}
                      >
                        <UserMinus className="w-4 h-4" />
                        Remove from trip
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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

      <AlertDialog
        open={!!mutingMember}
        onOpenChange={(open) => !open && setMutingMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mute {mutingMember?.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This member will not be able to post messages in the trip
              discussion. You can unmute them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={muteMember.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleMute}
              disabled={muteMember.isPending}
            >
              {muteMember.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Mute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
