import chromium from "chrome-aws-lambda";
import puppeteer, { Browser } from "puppeteer-core";

export async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_REGION) {
    const executablePath = await chromium.executablePath;

    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || undefined,
      headless: chromium.headless,
    });
  }

  const puppeteerDev = await import("puppeteer");
  return puppeteerDev.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--allow-running-insecure-content",
    ],
  }) as unknown as Browser;
}
