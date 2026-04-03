"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinnishTime = getFinnishTime;
exports.getCurrentFinnishLocalTime = getCurrentFinnishLocalTime;
exports.createFromFinnishTime = createFromFinnishTime;
exports.toFinnishTime = toFinnishTime;
exports.createFinnishTime = createFinnishTime;
exports.formatFinnishTime = formatFinnishTime;
exports.getFinnishTimezoneOffset = getFinnishTimezoneOffset;
exports.isWithinFinnishBusinessHours = isWithinFinnishBusinessHours;
exports.getFinnishStartOfDay = getFinnishStartOfDay;
exports.getFinnishEndOfDay = getFinnishEndOfDay;
const date_fns_tz_1 = require("date-fns-tz");
// Finnish timezone identifier
const FINNISH_TIMEZONE = 'Europe/Helsinki';
/**
 * TIMEZONE STRATEGY FOR AWS DEPLOYMENT
 *
 * ✅ CORRECT APPROACH:
 * - Store ALL timestamps as UTC in database (PostgreSQL default)
 * - JavaScript Date objects are timezone-agnostic (internally UTC)
 * - Server timezone (US AWS region) does NOT affect this implementation
 * - Finnish timezone conversion is handled explicitly when needed
 *
 * ✅ WHY THIS WORKS:
 * - new Date() always returns current UTC moment regardless of server location
 * - Database timestamp columns store UTC values
 * - Finnish business logic uses explicit timezone conversion
 */
/**
 * Get current timestamp for database storage
 * Returns current UTC moment - works correctly regardless of server timezone
 * @returns Date object representing current UTC time (safe for database storage)
 */
function getFinnishTime() {
    return new Date(); // Always UTC, works from any AWS region
}
/**
 * Get current time as it appears in Finnish timezone
 * Use this when you need to work with Finnish local time values
 * @returns Date object representing what the clock shows in Finland right now
 */
function getCurrentFinnishLocalTime() {
    const utcNow = new Date();
    return (0, date_fns_tz_1.toZonedTime)(utcNow, FINNISH_TIMEZONE);
}
/**
 * Create a Date from Finnish local time components
 * Use when you need to create a timestamp from Finnish local values (e.g., "9:00 AM Finnish time")
 * @param year - Year
 * @param month - Month (0-11, where 0 = January)
 * @param day - Day of month
 * @param hour - Hour in Finnish time (0-23), defaults to 0
 * @param minute - Minute (0-59), defaults to 0
 * @param second - Second (0-59), defaults to 0
 * @returns Date object in UTC that represents the Finnish local time
 */
function createFromFinnishTime(year, month, day, hour = 0, minute = 0, second = 0) {
    // Create a date in Finnish timezone, then convert to UTC for storage
    const finnishLocal = new Date(year, month, day, hour, minute, second);
    return (0, date_fns_tz_1.fromZonedTime)(finnishLocal, FINNISH_TIMEZONE);
}
/**
 * Convert a date to Finnish timezone for display
 * @param date - The date to convert
 * @returns Date object representing the same moment in Finnish timezone
 */
function toFinnishTime(date) {
    return (0, date_fns_tz_1.toZonedTime)(date, FINNISH_TIMEZONE);
}
/**
 * Create a new date in Finnish timezone and convert to UTC for database storage
 * @param year - Year
 * @param month - Month (0-11, where 0 = January)
 * @param day - Day of month
 * @param hour - Hour (0-23), defaults to 0
 * @param minute - Minute (0-59), defaults to 0
 * @param second - Second (0-59), defaults to 0
 * @returns Date object in UTC that represents the Finnish local time
 */
// Legacy function - keeping for backward compatibility
function createFinnishTime(year, month, day, hour = 0, minute = 0, second = 0) {
    return createFromFinnishTime(year, month, day, hour, minute, second);
}
/**
 * Format a date in Finnish timezone
 * @param date - The date to format
 * @param formatString - Format string (e.g., 'yyyy-MM-dd HH:mm:ss')
 * @returns Formatted date string in Finnish timezone
 */
function formatFinnishTime(date, formatString = 'yyyy-MM-dd HH:mm:ss') {
    const finnishDate = (0, date_fns_tz_1.toZonedTime)(date, FINNISH_TIMEZONE);
    return (0, date_fns_tz_1.format)(finnishDate, formatString, { timeZone: FINNISH_TIMEZONE });
}
/**
 * Get the current Finnish timezone offset in minutes
 * @returns Offset in minutes from UTC (positive means ahead of UTC)
 */
/**
 * Get the current Finnish timezone offset in hours from UTC
 * Useful for debugging and logging
 * @returns Offset in hours from UTC (e.g., +2 for summer, +1 for winter)
 */
function getFinnishTimezoneOffset() {
    const now = new Date();
    const finnishTime = (0, date_fns_tz_1.toZonedTime)(now, FINNISH_TIMEZONE);
    const utcTime = now.getTime();
    const localTime = finnishTime.getTime();
    return Math.round((localTime - utcTime) / (1000 * 60 * 60));
}
/**
 * Check if current Finnish time is within business hours
 * @param startHour - Business start hour (default: 8 AM)
 * @param endHour - Business end hour (default: 6 PM)
 * @returns true if current Finnish time is within business hours
 */
function isWithinFinnishBusinessHours(startHour = 8, endHour = 18) {
    const finnishNow = getCurrentFinnishLocalTime();
    const currentHour = finnishNow.getHours();
    return currentHour >= startHour && currentHour < endHour;
}
/**
 * Get start of day in Finnish timezone (Finnish midnight as UTC)
 * Useful for date queries that need to start from Finnish midnight
 * @param date - Optional date, defaults to current Finnish date
 * @returns Date object representing start of Finnish day (00:00 Finnish time)
 */
function getFinnishStartOfDay(date) {
    const targetDate = date ? (0, date_fns_tz_1.toZonedTime)(date, FINNISH_TIMEZONE) : getCurrentFinnishLocalTime();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    return createFromFinnishTime(year, month, day, 0, 0, 0);
}
/**
 * Get end of day in Finnish timezone (just before Finnish midnight as UTC)
 * @param date - Optional date, defaults to current Finnish date
 * @returns Date object representing end of Finnish day (23:59:59.999 Finnish time)
 */
function getFinnishEndOfDay(date) {
    const targetDate = date ? (0, date_fns_tz_1.toZonedTime)(date, FINNISH_TIMEZONE) : getCurrentFinnishLocalTime();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    return createFromFinnishTime(year, month, day, 23, 59, 59);
}
