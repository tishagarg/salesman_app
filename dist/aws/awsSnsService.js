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
exports.sendMessage = exports.EmailType = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
var EmailType;
(function (EmailType) {
    EmailType[EmailType["RESET_PASSWORD"] = 0] = "RESET_PASSWORD";
    EmailType[EmailType["LOGIN_REQUEST"] = 1] = "LOGIN_REQUEST";
    EmailType[EmailType["SET_PASSWORD"] = 2] = "SET_PASSWORD";
    EmailType[EmailType["VERIFY_PHONE"] = 3] = "VERIFY_PHONE";
})(EmailType || (exports.EmailType = EmailType = {}));
// AWS configuration
aws_sdk_1.default.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});
const sns = new aws_sdk_1.default.SNS({ apiVersion: "2010–03–31" });
const sendMessage = (otpOrLink, phone, type) => __awaiter(void 0, void 0, void 0, function* () {
    let message;
    switch (type) {
        case EmailType.VERIFY_PHONE:
            message = `You have initiated a phone number change request. Please use the following OTP to verify it: ${otpOrLink}`;
            break;
        case EmailType.RESET_PASSWORD:
            message = `You are receiving this because you (or someone else) have requested the reset of the password for your account. Please use the following OTP to reset the password: ${otpOrLink}`;
            break;
        case EmailType.LOGIN_REQUEST:
            message = `You are receiving this because you (or someone else) have requested to log in to your account. Please use the following OTP to log in to your account: ${otpOrLink}`;
            break;
        default:
            throw new Error("Invalid message type");
    }
    const params = {
        Message: message,
        PhoneNumber: phone,
    };
    try {
        const data = yield sns.publish(params).promise();
        console.log(`MessageID is ${data.MessageId}`);
    }
    catch (err) {
        console.error(err);
    }
});
exports.sendMessage = sendMessage;
