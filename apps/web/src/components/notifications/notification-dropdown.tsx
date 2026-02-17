"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/use-notifications";
import type { Notification } from "@tripful/shared/types";
import { NotificationItem } from "./notification-item";

const TRIP_PAGE_REGEX = /^\/trips\/([^/]+)/;

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading } = useNotifications({ limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const totalCount = data?.meta?.total ?? 0;
  const hasMore = notifications.length < totalCount;
  const hasUnread = useMemo(() => notifications.some((n) => n.readAt === null), [notifications]);

  // Extract tripId from pathname when on a trip detail page
  const tripPageMatch = pathname.match(TRIP_PAGE_REGEX);
  const currentTripId = tripPageMatch?.[1];

  function handleNotificationClick(notification: Notification) {
    if (notification.readAt === null) {
      markAsRead.mutate(notification.id);
    }

    if (notification.tripId) {
      if (
        notification.type === "trip_message" &&
        notification.data?.messageId
      ) {
        router.push(`/trips/${notification.tripId}#discussion`);
      } else {
        router.push(`/trips/${notification.tripId}`);
      }
    }

    onClose();
  }

  function handleMarkAllAsRead() {
    markAllAsRead.mutate(undefined);
  }

  function handleViewAll() {
    if (currentTripId) {
      router.push(`/trips/${currentTripId}`);
    } else {
      router.push("/trips");
    }
    onClose();
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10">
        <Bell className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="max-h-[480px] overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold">Notifications</h2>
        {hasUnread && (
          <Button
            variant="ghost"
            size="xs"
            className="text-sm text-primary"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </Button>
        )}
      </div>
      <Separator />
      {notifications.map((notification, index) => (
        <div key={notification.id}>
          <NotificationItem
            notification={notification}
            onClick={handleNotificationClick}
          />
          {index < notifications.length - 1 && <Separator />}
        </div>
      ))}
      {hasMore && (
        <>
          <Separator />
          <div className="flex justify-center py-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-muted-foreground"
              onClick={handleViewAll}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
