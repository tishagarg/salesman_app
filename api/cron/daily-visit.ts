import { VercelRequest, VercelResponse } from '@vercel/node';
import { runDailyVisitPlanning } from '../../src/service/nodeCron.service';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await runDailyVisitPlanning();
    console.log("Daily visit planning ran via scheduled cron job.");
    res.status(200).json({ message: "Success" });
  } catch (err) {
    console.error("Cron job failed:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
