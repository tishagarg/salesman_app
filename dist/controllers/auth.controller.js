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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const otp_service_1 = require("../service/otp.service");
const api_response_1 = require("../utils/api.response");
const auth_service_1 = require("../service/auth.service");
const otpMedium_1 = require("../enum/otpMedium");
const otpType_1 = require("../enum/otpType");
const authService = new auth_service_1.AuthService();
const otpService = new otp_service_1.OtpService();
class AuthController {
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { email, password } = req.body;
            const response = yield authService.login({ email, password });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    google(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { idToken } = req.body;
            const response = yield authService.google(idToken);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    signup(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const params = {
                email: req.body.email,
                password: req.body.password,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                org_name: req.body.org_name,
                phone_no: req.body.phone_no,
            };
            const response = yield authService.signup(params);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    verifyOTP(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let { user_id } = req.user;
            const { otp } = req.body;
            const response = yield authService.verifyOTP({
                id: user_id,
                otp,
                otp_type: otpType_1.OtpType.EMAIL_VERIFICATION,
                medium: otpMedium_1.OtpMedium.EMAIL,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    resendOTP(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { user_id, email } = req.user;
            const params = {
                email: email,
                id: user_id,
                otp_type: otpType_1.OtpType.EMAIL_VERIFICATION,
                medium: otpMedium_1.OtpMedium.EMAIL,
            };
            const response = yield otpService.resendOtp(params);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, null, response.status, null, response.message);
        });
    }
    logout(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let { token } = req.user;
            const response = yield authService.logout(token);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    forgotPassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { email } = req.body;
            const response = yield authService.forgotPassword(email);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
    resetPassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { token, oldPassword, newPassword } = req.body;
            var org_id;
            var user_id;
            if (req.user) {
                org_id = req.user.org_id;
                user_id = req.user.user_id;
            }
            const response = yield authService.resetPassword({
                token,
                oldPassword,
                newPassword,
                org_id,
                user_id,
            });
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = response.data) !== null && _a !== void 0 ? _a : null, response.status, null, response.message);
        });
    }
}
exports.AuthController = AuthController;
