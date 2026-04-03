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
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function sendEmail(param) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
            const emailPass = process.env.EMAIL_PASS;
            if (!emailFrom || !emailPass) {
                console.error("Missing email credentials: EMAIL_FROM or EMAIL_PASS not set");
                throw new Error("Missing email credentials - check EMAIL_FROM and EMAIL_PASS environment variables");
            }
            console.log(`Attempting to send email to: ${param.to}`);
            const transporter = nodemailer_1.default.createTransport({
                service: "gmail",
                secure: true,
                auth: {
                    user: emailFrom,
                    pass: emailPass,
                },
            });
            // Verify transporter configuration
            try {
                yield transporter.verify();
                console.log("Email transporter verified successfully");
            }
            catch (verifyError) {
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
                const result = yield transporter.sendMail(mailOptions);
                console.log("Email sent successfully:", result.messageId);
                return result;
            }
            catch (sendError) {
                console.error("Failed to send email:", sendError);
                throw new Error(`Email sending failed: ${sendError}`);
            }
        }
        catch (error) {
            console.error("Outer email function error:", error);
            throw error;
        }
    });
}
