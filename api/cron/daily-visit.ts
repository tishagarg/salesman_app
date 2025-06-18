import { VercelRequest, VercelResponse } from '@vercel/node';
import { runDailyVisitPlanning } from '../../src/service/nodeCron.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Cron endpoint hit:', {
    url: req.url,
    method: req.method,
    time: new Date().toISOString()
  });

  // Ensure only GET requests are processed (Vercel cron uses GET)
  if (req.method !== 'GET') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check if the request is for the cron endpoint
  if (req.url?.includes('/api/cron/daily-visit')) {
    try {
      await runDailyVisitPlanning();
      console.log('Daily visit planning ran successfully');
      return res.status(200).json({ message: 'Success' });
    } catch (err) {
      console.error('Cron job failed:', err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
  }

  // If authentication is required for other routes, return 401
  console.log('Unauthorized access:', req.url);
  return res.status(401).json({ error: 'Unauthorized' });
}