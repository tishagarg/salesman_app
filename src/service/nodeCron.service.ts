import cron from "node-cron";
import { VisitService } from "./visit.service";

const visitService = new VisitService();

// Define the task logic as a reusable function
export const planVisitsTask = async () => {
  console.log("Running daily visit planning...");

  try {
    const reps = await visitService.getRepsToPlanVisits();
    for (const rep of reps) {
      const managerId = await visitService.getManagerIdForRep(rep.user_id);
      console.log("managerId ", managerId);
      const response = await visitService.planDailyVisits(
        rep.user_id,
        managerId,
        new Date()
      );
      console.log(
        `Planned for rep ${rep.user_id}: ${response.status} - ${response.message}`
      );
    }
  } catch (error) {
    console.error("Error during scheduled visit planning:", error);
  }
};

// Schedule the task to run daily at 7:00 AM
const job = cron.schedule("0 7 * * *", planVisitsTask);

// Run the task immediately
