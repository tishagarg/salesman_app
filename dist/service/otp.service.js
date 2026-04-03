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
exports.OtpService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const otp_query_1 = require("../query/otp.query");
const user_query_1 = require("../query/user.query");
const data_source_1 = require("../config/data-source"); // Updated import
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const User_entity_1 = require("../models/User.entity");
const OTPVerification_entity_1 = require("../models/OTPVerification.entity");
const timezone_1 = require("../utils/timezone");
const email_service_1 = require("./email.service");
const otpQuery = new otp_query_1.OtpQuery();
const userQuery = new user_query_1.UserQuery();
class OtpService {
    generateOtp() {
        return __awaiter(this, void 0, void 0, function* () {
            return crypto_1.default.randomInt(100000, 999999).toString();
        });
    }
    generateSaveAndSendOtp(userId, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const otp = yield this.generateOtp();
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
                const otpData = {
                    otp,
                    user_id: userId,
                    is_used: false,
                    otp_type: params.otp_type,
                    medium: params.medium,
                    expires_at: expiresAt,
                    created_at: (0, timezone_1.getFinnishTime)(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                };
                const existingOtp = yield otpQuery.findByUserIdAndType(userId, params.otp_type, queryRunner.manager);
                if (existingOtp &&
                    existingOtp.medium === params.medium &&
                    existingOtp.otp_type === params.otp_type &&
                    !existingOtp.is_used &&
                    existingOtp.expires_at > (0, timezone_1.getFinnishTime)()) {
                    otpData.otp_id = existingOtp.otp_id;
                    otpData.is_used = existingOtp.is_used;
                    otpData.expires_at = existingOtp.expires_at;
                    otpData.created_at = existingOtp.created_at;
                    otpData.updated_at = (0, timezone_1.getFinnishTime)();
                }
                const savedOtp = yield otpQuery.saveOtp(otpData, queryRunner.manager);
                yield this.SendEmailNotification(params.email, otp);
                yield queryRunner.commitTransaction();
                return savedOtp;
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error generating and saving OTP:", error);
                throw new Error("Failed to generate OTP");
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    SendEmailNotification(email, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, email_service_1.sendEmail)({
                to: email,
                subject: "Email Verification",
                body: `Your OTP is ${otp} and it is valid for 5 minutes.`,
            });
        });
    }
    resendOtp(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const user = yield userQuery.findByEmailAndId(params.email, params.id, queryRunner.manager);
                if (!user) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "User not found",
                    };
                }
                if (user.is_email_verified) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Email already verified",
                    };
                }
                const otpData = yield otpQuery.findById(user.user_id, queryRunner.manager);
                if (!otpData) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "No OTP found for this user",
                    };
                }
                const newOtp = yield this.generateOtp();
                otpData.otp = newOtp;
                otpData.expires_at = new Date(Date.now() + 5 * 60 * 1000);
                otpData.created_at = (0, timezone_1.getFinnishTime)();
                otpData.updated_at = (0, timezone_1.getFinnishTime)();
                yield otpQuery.saveOtp(otpData, queryRunner.manager); // Pass manager
                yield this.SendEmailNotification(params.email, newOtp);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    message: `OTP resent to ${params.email}`,
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.BAD_REQUEST,
                    message: error instanceof Error ? error.message : "Unknown error",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    verifyOtp(userId, otp, otp_type) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const otpData = yield queryRunner.manager.findOne(OTPVerification_entity_1.OtpVerification, {
                    where: { user_id: userId, otp_type: otp_type, otp },
                });
                if (!otpData) {
                    yield queryRunner.rollbackTransaction();
                    return false;
                }
                const isOtpValid = otpData.otp === otp &&
                    otpData.is_used === false &&
                    otpData.expires_at > (0, timezone_1.getFinnishTime)();
                if (isOtpValid) {
                    yield queryRunner.manager.update(User_entity_1.User, userId, {
                        is_email_verified: 1,
                        is_active: true,
                    });
                    yield queryRunner.manager.delete(OTPVerification_entity_1.OtpVerification, otpData.otp_id);
                    yield queryRunner.commitTransaction();
                }
                else {
                    yield queryRunner.rollbackTransaction();
                }
                return isOtpValid;
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return false;
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    saveOtpOrLink(manager, params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
                const otpData = {
                    otp: params.otp,
                    user_id: params.user_id,
                    is_used: false,
                    otp_type: params.otp_type,
                    medium: params.medium,
                    expires_at: expiresAt,
                    created_at: (0, timezone_1.getFinnishTime)(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                };
                const existingOtp = yield otpQuery.findByUserIdAndType(params.user_id, params.otp_type, manager);
                if (existingOtp &&
                    existingOtp.medium === params.medium &&
                    existingOtp.otp_type === params.otp_type &&
                    !existingOtp.is_used &&
                    existingOtp.expires_at > (0, timezone_1.getFinnishTime)()) {
                    otpData.otp_id = existingOtp.otp_id;
                    otpData.is_used = existingOtp.is_used;
                    otpData.expires_at = existingOtp.expires_at;
                    otpData.created_at = existingOtp.created_at;
                    otpData.updated_at = (0, timezone_1.getFinnishTime)();
                }
                const savedOtp = yield otpQuery.saveOtp(otpData, manager);
                return savedOtp;
            }
            catch (error) {
                console.error("Error saving OTP:", error);
                throw new Error("Failed to save OTP");
            }
        });
    }
}
exports.OtpService = OtpService;
