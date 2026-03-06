"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { APIError } from "@/lib/api";
import { toast } from "sonner";

interface CalendarStatusResponse {
  success: true;
  enabled: boolean;
  calendarUrl?: string;
}

interface CalendarEnableResponse {
  success: true;
  calendarUrl: string;
  calendarToken: string;
}

interface CalendarDisableResponse {
  success: true;
}

interface CalendarRegenerateResponse {
  success: true;
  calendarUrl: string;
  calendarToken: string;
}

export function useCalendarStatus() {
  return useQuery<CalendarStatusResponse, APIError>({
    queryKey: ["calendarStatus"],
    queryFn: async () => {
      return apiRequest<CalendarStatusResponse>("/users/me/calendar");
    },
  });
}

export function useEnableCalendar() {
  const queryClient = useQueryClient();

  return useMutation<CalendarEnableResponse, APIError, void>({
    mutationKey: ["enableCalendar"],
    mutationFn: async () => {
      return apiRequest<CalendarEnableResponse>("/users/me/calendar", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast.success("Calendar sync enabled");
      queryClient.invalidateQueries({ queryKey: ["calendarStatus"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enable calendar sync");
    },
  });
}

export function useDisableCalendar() {
  const queryClient = useQueryClient();

  return useMutation<CalendarDisableResponse, APIError, void>({
    mutationKey: ["disableCalendar"],
    mutationFn: async () => {
      return apiRequest<CalendarDisableResponse>("/users/me/calendar", {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast.success("Calendar sync disabled");
      queryClient.invalidateQueries({ queryKey: ["calendarStatus"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disable calendar sync");
    },
  });
}

export function useRegenerateCalendar() {
  const queryClient = useQueryClient();

  return useMutation<CalendarRegenerateResponse, APIError, void>({
    mutationKey: ["regenerateCalendar"],
    mutationFn: async () => {
      return apiRequest<CalendarRegenerateResponse>(
        "/users/me/calendar/regenerate",
        {
          method: "POST",
        },
      );
    },
    onSuccess: () => {
      toast.success("Calendar URL regenerated");
      queryClient.invalidateQueries({ queryKey: ["calendarStatus"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate calendar URL");
    },
  });
}

export function useUpdateTripCalendarExclusion(tripId: string) {
  return useMutation<{ success: true }, APIError, { excluded: boolean }>({
    mutationKey: ["updateTripCalendarExclusion", tripId],
    mutationFn: async (data) => {
      return apiRequest<{ success: true }>(
        `/trips/${tripId}/members/me/calendar`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      );
    },
    onSuccess: () => {
      toast.success("Calendar preference updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update calendar preference");
    },
  });
}
