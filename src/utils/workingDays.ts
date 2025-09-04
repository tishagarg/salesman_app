import axios from "axios";
import {
  addDays,
  endOfMonth,
  isWeekend,
  parseISO,
  getDaysInMonth,
  format,
} from "date-fns";
import { Response } from "express";
import { getFinnishTime } from "./timezone";

// Interface for Nager.Date API holiday response
interface Holiday {
  date: string;
  name: string;
  counties: string[] | null;
}

// Interface for month data output
interface MonthData {
  currentMonth: number;
  monthName: string;
  totalDays: number;
  holidays: number;
  weekends: number;
  publicHolidays: { date: string; name: string }[];
  workingDaysLeft: number;
}

export async function getCurrentMonthData() {
  try {
    const countryCode = "FI";
    const region = "FI-BW";
    const today = getFinnishTime(); // Dynamic current date in Finnish timezone
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-based month (e.g., 6 for June, 7 for July)
    const startDate = today;
    const endDate = endOfMonth(today);
    const totalDays = getDaysInMonth(today);
    const monthName = format(today, "MMMM");

    // Fetch public holidays for the current year
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    const response = await axios.get<Holiday[]>(url);
    const holidayDates = response.data.filter(
      (holiday) => !holiday.counties || holiday.counties.includes(region)
    );

    // Filter holidays for the current month
    const monthHolidays = holidayDates.filter(
      (holiday) => parseISO(holiday.date).getMonth() + 1 === month
    );
    const holidays = monthHolidays.length;
    const publicHolidays = monthHolidays.map((holiday) => ({
      date: holiday.date,
      name: holiday.name,
    }));

    // Calculate weekends and working days from today to end of month
    let weekends = 0;
    let workingDays = 0;
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const isHoliday = monthHolidays.some(
        (holiday) => holiday.date === format(currentDate, "yyyy-MM-dd")
      );
      if (isWeekend(currentDate)) {
        weekends++;
      } else if (!isHoliday) {
        workingDays++;
      }
      currentDate = addDays(currentDate, 1);
    }

    const data: MonthData = {
      currentMonth: month,
      monthName,
      totalDays,
      holidays,
      weekends,
      publicHolidays,
      workingDaysLeft: workingDays,
    };
    return data;
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return null;
  }
}
