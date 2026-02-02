// Tests for shared utility functions

import { describe, it, expect } from 'vitest';
import { convertToUTC, formatInTimeZone } from '../utils/index.js';

describe('convertToUTC', () => {
  it('should convert PST time to UTC', () => {
    // 3:00 PM PST on Jan 15, 2024 should be 11:00 PM UTC (PST is UTC-8)
    const pstDate = new Date('2024-01-15T15:00:00');
    const utcDate = convertToUTC(pstDate, 'America/Los_Angeles');

    // The UTC date should be 8 hours ahead
    expect(utcDate.getUTCHours()).toBe(23); // 15 + 8 = 23
  });

  it('should convert EST time to UTC', () => {
    // 3:00 PM EST on Jan 15, 2024 should be 8:00 PM UTC (EST is UTC-5)
    const estDate = new Date('2024-01-15T15:00:00');
    const utcDate = convertToUTC(estDate, 'America/New_York');

    // The UTC date should be 5 hours ahead
    expect(utcDate.getUTCHours()).toBe(20); // 15 + 5 = 20
  });

  it('should handle timezone conversions across date boundaries', () => {
    // 11:00 PM PST should become 7:00 AM UTC the next day
    const pstDate = new Date('2024-01-15T23:00:00');
    const utcDate = convertToUTC(pstDate, 'America/Los_Angeles');

    expect(utcDate.getUTCHours()).toBe(7); // 23 + 8 = 31, which wraps to 7 next day
    expect(utcDate.getUTCDate()).toBe(16); // Next day
  });

  it('should handle different timezones correctly', () => {
    const date = new Date('2024-01-15T12:00:00');

    // Tokyo is UTC+9
    const tokyoToUtc = convertToUTC(date, 'Asia/Tokyo');
    expect(tokyoToUtc.getUTCHours()).toBe(3); // 12 - 9 = 3

    // London is UTC+0 in winter
    const londonToUtc = convertToUTC(date, 'Europe/London');
    expect(londonToUtc.getUTCHours()).toBe(12); // No change
  });
});

describe('formatInTimeZone', () => {
  it('should format with default 12-hour time format', () => {
    const date = new Date('2024-01-15T15:30:00Z'); // 3:30 PM UTC

    // In PST (UTC-8), this should be 7:30 AM
    const formatted = formatInTimeZone(date, 'America/Los_Angeles');
    expect(formatted).toBe('7:30 AM');
  });

  it('should format with custom format string', () => {
    const date = new Date('2024-01-15T15:30:00Z');

    const formatted = formatInTimeZone(date, 'America/Los_Angeles', 'yyyy-MM-dd HH:mm:ss');
    expect(formatted).toBe('2024-01-15 07:30:00');
  });

  it('should handle different timezones', () => {
    const date = new Date('2024-01-15T12:00:00Z'); // Noon UTC

    // New York (EST, UTC-5) should show 7:00 AM
    const nyTime = formatInTimeZone(date, 'America/New_York');
    expect(nyTime).toBe('7:00 AM');

    // Tokyo (JST, UTC+9) should show 9:00 PM
    const tokyoTime = formatInTimeZone(date, 'Asia/Tokyo');
    expect(tokyoTime).toBe('9:00 PM');

    // London (GMT, UTC+0 in winter) should show 12:00 PM
    const londonTime = formatInTimeZone(date, 'Europe/London');
    expect(londonTime).toBe('12:00 PM');
  });

  it('should format with various custom patterns', () => {
    const date = new Date('2024-06-15T15:30:45Z');

    // Different format patterns
    const formats = [
      { pattern: 'MMM dd, yyyy', expected: 'Jun 15, 2024' },
      { pattern: 'HH:mm', expected: '08:30' }, // 24-hour format in PST
      { pattern: 'EEEE, MMMM do yyyy', expected: 'Saturday, June 15th 2024' },
    ];

    formats.forEach(({ pattern, expected }) => {
      const formatted = formatInTimeZone(date, 'America/Los_Angeles', pattern);
      expect(formatted).toBe(expected);
    });
  });

  it('should handle midnight correctly', () => {
    const date = new Date('2024-01-15T08:00:00Z'); // Midnight PST

    const formatted = formatInTimeZone(date, 'America/Los_Angeles');
    expect(formatted).toBe('12:00 AM');
  });

  it('should handle noon correctly', () => {
    const date = new Date('2024-01-15T20:00:00Z'); // Noon PST

    const formatted = formatInTimeZone(date, 'America/Los_Angeles');
    expect(formatted).toBe('12:00 PM');
  });
});
