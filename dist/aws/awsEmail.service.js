"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.sendSESEmail = sendSESEmail;
exports.sendSESEmailWithAttachment = sendSESEmailWithAttachment;
exports.isSesIdentityVerified = isSesIdentityVerified;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const nodemailer = __importStar(require("nodemailer"));
aws_sdk_1.default.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});
const ses = new aws_sdk_1.default.SES({ apiVersion: '2010-12-01' });
function sendSESEmail(email, subject, htmlContent) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = {
            Destination: {
                ToAddresses: [email],
            },
            Message: {
                Body: {
                    Html: {
                        Data: htmlContent,
                    },
                },
                Subject: {
                    Data: subject,
                },
            },
            Source: 'admin@voxapp.com',
        };
        try {
            yield ses.sendEmail(params).promise();
        }
        catch (error) {
            console.log(error);
        }
    });
}
function sendSESEmailWithAttachment(email_1, subject_1, htmlContent_1, attachmentBuffer_1) {
    return __awaiter(this, arguments, void 0, function* (email, subject, htmlContent, attachmentBuffer, // Pass the PDF buffer here
    attachmentFilename = 'Call_Summary.pdf') {
        const transporter = nodemailer.createTransport({
            SES: { ses, aws: aws_sdk_1.default },
        });
        const mailOptions = {
            from: 'admin@voxapp.com',
            to: email,
            subject,
            html: htmlContent,
            attachments: [
                {
                    filename: attachmentFilename,
                    content: attachmentBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };
        try {
            yield transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
        }
        catch (error) {
            console.error('Error sending email:', error);
        }
    });
}
/**
 * return if the email is verified or not
 *
 * @param email email for which we want to check
 * @returns
 */
function isSesIdentityVerified(email) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const verificationResponse = yield ses
                .getIdentityVerificationAttributes({
                Identities: [email],
            })
                .promise();
            // Check if the email is verified
            const verificationStatus = (_a = verificationResponse.VerificationAttributes[email]) === null || _a === void 0 ? void 0 : _a.VerificationStatus;
            return verificationStatus === 'Success';
        }
        catch (error) {
            return false;
        }
    });
}
