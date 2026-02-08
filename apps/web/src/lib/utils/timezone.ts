/**
 * Timezone utility functions for formatting dates/times in specific timezones
 */

/**
 * Format a date in a specific timezone
 * @param date - Date to format (Date object or ISO string)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @param format - Format type: "date", "time", or "datetime"
 * @returns Formatted string
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  format: "date" | "time" | "datetime",
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Validate date
  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  try {
    // Format date
    if (format === "date") {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(dateObj);
    }

    // Format time
    if (format === "time") {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(dateObj);
    }

    // Format datetime
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(dateObj);
  } catch (error) {
    // Invalid timezone - fall back to local time
    console.error(`Invalid timezone: ${timezone}`, error);
    return dateObj.toLocaleString("en-US");
  }
}

/**
 * Get the day (YYYY-MM-DD) for a date in a specific timezone
 * Used for grouping events by day
 * @param date - Date to convert (Date object or ISO string)
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDayInTimezone(date: Date | string, timezone: string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Validate date
  if (isNaN(dateObj.getTime())) {
    return "1970-01-01";
  }

  try {
    // Use Intl.DateTimeFormat to get the date parts in the target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(dateObj);
    const year = parts.find((p) => p.type === "year")?.value || "0000";
    const month = parts.find((p) => p.type === "month")?.value || "00";
    const day = parts.find((p) => p.type === "day")?.value || "00";

    return `${year}-${month}-${day}`;
  } catch (error) {
    // Fall back to ISO date
    console.error(`Invalid timezone: ${timezone}`, error);
    return dateObj.toISOString().split("T")[0] || "1970-01-01";
  }
}

/**
 * Get a human-readable day label (e.g., "Today", "Tomorrow", "Mon, Jan 15")
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone string
 * @returns Human-readable day label
 */
export function getDayLabel(dateString: string, timezone: string): string {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  const todayString = getDayInTimezone(today, timezone);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = getDayInTimezone(tomorrow, timezone);

  if (dateString === todayString) {
    return "Today";
  }
  if (dateString === tomorrowString) {
    return "Tomorrow";
  }

  // Format as "Mon, Jan 15"
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Calculate number of nights between two dates
 * @param checkIn - Check-in date string (YYYY-MM-DD)
 * @param checkOut - Check-out date string (YYYY-MM-DD)
 * @returns Number of nights
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn + "T00:00:00");
  const checkOutDate = new Date(checkOut + "T00:00:00");
  const diffTime = checkOutDate.getTime() - checkInDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
