"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentMonthData = getCurrentMonthData;
const axios_1 = __importDefault(require("axios"));
const date_fns_1 = require("date-fns");
const timezone_1 = require("./timezone");
function getCurrentMonthData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const countryCode = "FI";
            const region = "FI-BW";
            const today = (0, timezone_1.getFinnishTime)(); // Dynamic current date in Finnish timezone
            const year = today.getFullYear();
            const month = today.getMonth() + 1; // 1-based month (e.g., 6 for June, 7 for July)
            const startDate = today;
            const endDate = (0, date_fns_1.endOfMonth)(today);
            const totalDays = (0, date_fns_1.getDaysInMonth)(today);
            const monthName = (0, date_fns_1.format)(today, "MMMM");
            // Fetch public holidays for the current year
            const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
            const response = yield axios_1.default.get(url);
            const holidayDates = response.data.filter((holiday) => !holiday.counties || holiday.counties.includes(region));
            // Filter holidays for the current month
            const monthHolidays = holidayDates.filter((holiday) => (0, date_fns_1.parseISO)(holiday.date).getMonth() + 1 === month);
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
                const isHoliday = monthHolidays.some((holiday) => holiday.date === (0, date_fns_1.format)(currentDate, "yyyy-MM-dd"));
                if ((0, date_fns_1.isWeekend)(currentDate)) {
                    weekends++;
                }
                else if (!isHoliday) {
                    workingDays++;
                }
                currentDate = (0, date_fns_1.addDays)(currentDate, 1);
            }
            const data = {
                currentMonth: month,
                monthName,
                totalDays,
                holidays,
                weekends,
                publicHolidays,
                workingDaysLeft: workingDays,
            };
            return data;
        }
        catch (error) {
            console.error("Error fetching holidays:", error);
            return null;
        }
    });
}
