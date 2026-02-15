"use client";

import { useRouter } from "next/navigation";
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

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const { data, isLoading } = useNotifications({ limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const hasUnread = notifications.some((n) => n.readAt === null);

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
    </div>
  );
}
