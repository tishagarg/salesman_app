import nodemailer from "nodemailer";
import { IMail } from "../interfaces/common.interface";
import dotenv from "dotenv";
dotenv.config();

export async function sendEmail(param: IMail) {
  try {
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

  if (!emailFrom || !emailPass) {
    console.error("Missing email credentials: EMAIL_FROM or EMAIL_PASS not set");
    throw new Error("Missing email credentials - check EMAIL_FROM and EMAIL_PASS environment variables");
  }

  console.log(`Attempting to send email to: ${param.to}`);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: emailFrom,
      pass: emailPass,
    },
  });

  // Verify transporter configuration
  try {
    await transporter.verify();
    console.log("Email transporter verified successfully");
  } catch (verifyError) {
    console.error("Email transporter verification failed:", verifyError);
    throw new Error(`Email configuration invalid: ${verifyError}`);
  }

  const mailOptions = {
    from: emailFrom,
    to: param.to,
    subject: param.subject,
    text: param.body,
    html: param.body,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return result;
  } catch (sendError) {
    console.error("Failed to send email:", sendError);
    throw new Error(`Email sending failed: ${sendError}`);
  }
  } catch (error) {
    console.error("Outer email function error:", error);
    throw error;
  }
}
