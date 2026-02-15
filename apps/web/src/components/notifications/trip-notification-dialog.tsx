"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Notification } from "@tripful/shared/types";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import { NotificationPreferences } from "./notification-preferences";

const PAGE_SIZE = 20;

interface TripNotificationDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripNotificationDialog({
  tripId,
  open,
  onOpenChange,
}: TripNotificationDialogProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications({
    tripId,
    limit: PAGE_SIZE * page,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.notifications ?? [];
  const totalCount = data?.meta?.total ?? 0;
  const hasMore = notifications.length < totalCount;
  const hasUnread = notifications.some((n) => n.readAt === null);

  const handleLoadMore = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

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

    onOpenChange(false);
  }

  function handleMarkAllAsRead() {
    markAllAsRead.mutate({ tripId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-[family-name:var(--font-playfair)] tracking-tight">
            Trip notifications
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and manage notifications for this trip
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notifications">
          <TabsList className="w-full">
            <TabsTrigger value="notifications" className="flex-1">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1">
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            {isLoading ? (
              <div className="py-4">
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
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10">
                <Bell className="mb-2 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No notifications for this trip
                </p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {hasUnread && (
                  <>
                    <div className="flex items-center justify-end py-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-sm text-primary"
                        onClick={handleMarkAllAsRead}
                      >
                        Mark all as read
                      </Button>
                    </div>
                    <Separator />
                  </>
                )}
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
                        onClick={handleLoadMore}
                      >
                        Load more
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preferences">
            <NotificationPreferences tripId={tripId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
