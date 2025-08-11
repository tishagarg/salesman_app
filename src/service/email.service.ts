import nodemailer from "nodemailer";
import { IMail } from "../interfaces/common.interface";
import dotenv from "dotenv";
dotenv.config();

export async function sendEmail(param: IMail) {
  const emailFrom = process.env.EMAIL_FROM;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailFrom || !emailPass) {
    throw new Error("Missing email credentials");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: emailFrom,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: param.to,
    subject: param.subject,
    text: param.subject,
    html: `<p>${param.body}</p>`,
  });
}
