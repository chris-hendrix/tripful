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
export function getDayInTimezone(
  date: Date | string,
  timezone: string,
): string {
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
 * Parse a UTC ISO string into date and time parts in a specific timezone
 * @param isoString - UTC ISO datetime string (e.g., "2026-03-15T22:00:00.000Z")
 * @param timezone - IANA timezone string (e.g., "America/Los_Angeles")
 * @returns Object with date ("YYYY-MM-DD") and time ("HH:mm") in the target timezone
 */
export function utcToLocalParts(
  isoString: string,
  timezone: string,
): { date: string; time: string } {
  const dateObj = new Date(isoString);
  if (isNaN(dateObj.getTime())) {
    return { date: "", time: "" };
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(dateObj);
    const year = parts.find((p) => p.type === "year")?.value || "0000";
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    let hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";

    // Intl with hour12:false can return "24" for midnight — normalize to "00"
    if (hour === "24") hour = "00";

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
    };
  } catch {
    return { date: "", time: "" };
  }
}

/**
 * Combine local date and time parts into a UTC ISO string
 * @param date - Local date string in "YYYY-MM-DD" format
 * @param time - Local time string in "HH:mm" format
 * @param timezone - IANA timezone string (e.g., "America/Los_Angeles")
 * @returns UTC ISO string (e.g., "2026-03-15T22:00:00.000Z")
 */
export function localPartsToUTC(
  date: string,
  time: string,
  timezone: string,
): string {
  if (!date || !time) return "";

  // Build a locale string in the target timezone and find the UTC offset
  // by comparing with a known UTC interpretation
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hours === undefined ||
    minutes === undefined
  ) {
    return "";
  }

  // Use a binary-search-free approach: construct the date in UTC, then
  // find the offset of that timezone at that approximate instant, and adjust.
  // Step 1: Create a rough UTC date
  const roughUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  // Step 2: Find the offset of the timezone at that rough instant
  const offsetMs = getTimezoneOffsetMs(roughUtc, timezone);

  // Step 3: The actual UTC time is the local time minus the offset
  const actualUtc = new Date(roughUtc.getTime() - offsetMs);

  // Step 4: Verify by converting back — DST edge cases may shift by an hour
  const verifyOffset = getTimezoneOffsetMs(actualUtc, timezone);
  if (verifyOffset !== offsetMs) {
    // Re-adjust with the corrected offset
    return new Date(roughUtc.getTime() - verifyOffset).toISOString();
  }

  return actualUtc.toISOString();
}

/**
 * Get timezone offset in milliseconds at a given UTC instant
 */
function getTimezoneOffsetMs(utcDate: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const y = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const mo = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const d = parseInt(parts.find((p) => p.type === "day")?.value || "1");
  let h = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const mi = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const s = parseInt(parts.find((p) => p.type === "second")?.value || "0");

  if (h === 24) h = 0;

  const localAsUtc = Date.UTC(y, mo, d, h, mi, s);
  return localAsUtc - utcDate.getTime();
}

/**
 * Get the day number without leading zero (e.g., "7" from "2026-02-07")
 */
export function getDayNumber(dateString: string): string {
  const day = dateString.split("-")[2];
  return day ? String(parseInt(day, 10)) : "0";
}

/**
 * Get 3-letter month abbreviation (e.g., "Feb") for a date string in a timezone
 */
export function getMonthAbbrev(dateString: string, timezone: string): string {
  const date = new Date(dateString + "T12:00:00");
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
    }).format(date);
  } catch {
    return "";
  }
}

/**
 * Get 3-letter weekday abbreviation (e.g., "Mon") for a date string in a timezone
 */
export function getWeekdayAbbrev(dateString: string, timezone: string): string {
  const date = new Date(dateString + "T12:00:00");
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(date);
  } catch {
    return "";
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
