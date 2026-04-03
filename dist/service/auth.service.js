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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const user_query_1 = require("../query/user.query");
const bcrypt_1 = require("../config/bcrypt");
const jwt_1 = require("../config/jwt");
const otp_service_1 = require("./otp.service");
const usertoken_query_1 = require("../query/usertoken.query");
const google_auth_library_1 = require("google-auth-library");
const data_source_1 = require("../config/data-source"); // Updated import
const organization_query_1 = require("../query/organization.query");
const otpMedium_1 = require("../enum/otpMedium");
const otpType_1 = require("../enum/otpType");
const User_entity_1 = require("../models/User.entity");
const timezone_1 = require("../utils/timezone");
const role_query_1 = require("../query/role.query");
const email_service_1 = require("./email.service");
const roles_1 = require("../enum/roles");
const RefreshToken_entity_1 = require("../models/RefreshToken.entity");
const typeorm_1 = require("typeorm");
const userQuery = new user_query_1.UserQuery();
const otpService = new otp_service_1.OtpService();
const userTokenQuery = new usertoken_query_1.UserTokenQuery();
const organizationQuery = new organization_query_1.OrganizationQuery();
const roleQuery = new role_query_1.RoleQuery();
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
class AuthService {
    constructor() {
        this.refreshTokenTTL = 7 * 24 * 60 * 60; // 7 days in seconds
        this.ttl = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
    }
    sendPasswordResetNotification(email, resetLink) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Sending password reset email to: ${email}`);
                yield (0, email_service_1.sendEmail)({
                    to: email,
                    subject: "Password Reset Request",
                    body: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
                });
                console.log(`Password reset email sent successfully to: ${email}`);
            }
            catch (error) {
                console.error(`Failed to send password reset email to ${email}:`, error);
                throw new Error(`Failed to send password reset email: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    login(_a) {
        return __awaiter(this, arguments, void 0, function* ({ email, password }) {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                if (!email || !password) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Email and password are required",
                    };
                }
                const user = yield userQuery.findUserByEmail(queryRunner.manager, email);
                if (!user) {
                    yield queryRunner.rollbackTransaction();
                    return { status: http_status_codes_1.default.NOT_FOUND, message: "User not found" };
                }
                if (!user.is_active) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.UNAUTHORIZED,
                        message: "User inactive",
                    };
                }
                const isPasswordValid = yield (0, bcrypt_1.passwordCompare)(password, user.password_hash);
                if (!isPasswordValid) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.UNAUTHORIZED,
                        message: "Invalid credentials",
                    };
                }
                const token = (0, jwt_1.jwtSign)(user.user_id, user === null || user === void 0 ? void 0 : user.org_id, user.email, user.role_id, user.is_super_admin, user.is_admin);
                const getUserByIdWithOrganization = yield organizationQuery.getUserByIdWithOrganization(queryRunner.manager, user.user_id);
                // const existingTokens = await userTokenQuery.findTokenById(
                //   queryRunner.manager,
                //   user.user_id
                // );
                // if (existingTokens.length) {
                //   await userTokenQuery.deleteUserTokens(
                //     queryRunner.manager,
                //     user.user_id
                //   );
                // }
                yield userQuery.saveToken(queryRunner.manager, {
                    id: token,
                    userId: user.user_id,
                    ttl: this.ttl,
                    scopes: "user",
                    status: 1,
                    active: 1,
                });
                // const existingRefreshToken = await userTokenQuery.findRefreshTokenById(
                //   queryRunner.manager,
                //   user.user_id
                // );
                // if (existingRefreshToken) {
                //   await userTokenQuery.deleteRefreshTokens(
                //     queryRunner.manager,
                //     user.user_id
                //   );
                // }
                const newRefreshToken = (0, jwt_1.generateRefreshToken)(user.user_id);
                const refreshToken = queryRunner.manager
                    .getRepository(RefreshToken_entity_1.RefreshToken)
                    .create({
                    token: newRefreshToken,
                    user_id: user.user_id,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    created_at: (0, timezone_1.getFinnishTime)(),
                });
                yield queryRunner.manager.getRepository(RefreshToken_entity_1.RefreshToken).save(refreshToken);
                const { password_hash } = user, safeUser = __rest(user, ["password_hash"]);
                if (user.is_active && !user.is_email_verified) {
                    yield queryRunner.commitTransaction();
                    yield otpService.generateSaveAndSendOtp(user.user_id, {
                        email: user.email,
                        medium: otpMedium_1.OtpMedium.EMAIL,
                        otp_type: otpType_1.OtpType.EMAIL_VERIFICATION,
                    });
                    return {
                        status: http_status_codes_1.default.OK,
                        data: {
                            token,
                            refreshToken: refreshToken.token,
                            user: safeUser,
                            organization: getUserByIdWithOrganization.organization,
                        },
                        message: "Email not verified",
                    };
                }
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: {
                        token,
                        refreshToken: refreshToken.token,
                        user: safeUser,
                        organization: getUserByIdWithOrganization.organization,
                    },
                    message: "Login successful",
                };
            }
            catch (error) {
                console.log(error);
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: (error === null || error === void 0 ? void 0 : error.message) || "Internal server error",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const tokenRecord = yield queryRunner.manager
                    .getRepository(RefreshToken_entity_1.RefreshToken)
                    .findOneByOrFail({ token: refreshToken });
                if (tokenRecord.expires_at < (0, timezone_1.getFinnishTime)()) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        data: null,
                        status: http_status_codes_1.default.UNAUTHORIZED,
                        message: "Token is expired",
                    };
                }
                const decoded = yield (0, jwt_1.verifyRefreshToken)(refreshToken);
                const user = yield queryRunner.manager.getRepository(User_entity_1.User).findOne({
                    where: { user_id: decoded.user_id },
                });
                if (!user) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "User not found",
                        data: null,
                    };
                }
                if (!user.is_active) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.UNAUTHORIZED,
                        message: "User inactive",
                        data: null,
                    };
                }
                const newAccessToken = (0, jwt_1.jwtSign)(user.user_id, user.org_id, user.email, user.role_id, user.is_super_admin, user.is_admin);
                yield userQuery.saveToken(queryRunner.manager, {
                    id: newAccessToken,
                    userId: user.user_id,
                    ttl: this.ttl,
                    scopes: "user",
                    status: 1,
                    active: 1,
                });
                yield queryRunner.manager
                    .getRepository(RefreshToken_entity_1.RefreshToken)
                    .delete({ token: refreshToken });
                const newRefreshToken = (0, jwt_1.generateRefreshToken)(user.user_id);
                const savedRefreshToken = yield this.saveRefreshToken(queryRunner.manager, user.user_id, newRefreshToken);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: { token: newAccessToken, refreshToken: savedRefreshToken.token },
                    message: "Token refreshed successfully",
                };
            }
            catch (error) {
                console.error("Refresh token error:", error);
                yield queryRunner.rollbackTransaction();
                if (error instanceof typeorm_1.EntityNotFoundError) {
                    return {
                        data: null,
                        status: http_status_codes_1.default.UNAUTHORIZED,
                        message: "Invalid or missing refresh token",
                    };
                }
                return {
                    data: null,
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: "Internal server error",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    // Add this method to your class
    saveRefreshToken(manager, userId, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const refreshToken = manager.getRepository(RefreshToken_entity_1.RefreshToken).create({
                token,
                user_id: userId,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                created_at: (0, timezone_1.getFinnishTime)(),
            });
            return yield manager.getRepository(RefreshToken_entity_1.RefreshToken).save(refreshToken);
        });
    }
    google(idToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const ticket = yield client.verifyIdToken({
                    idToken,
                    audience: process.env.GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                if (!payload) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Invalid token payload",
                    };
                }
                const { email, name, sub: googleId, picture: avatar, email_verified, } = payload;
                let user = yield userQuery.findUserByGoogleId(queryRunner.manager, googleId);
                if (!user) {
                    const existingUserByEmail = yield userQuery.findUserByEmail(queryRunner.manager, email ? email : "");
                    if (existingUserByEmail) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.BAD_REQUEST,
                            message: "Email is already registered",
                        };
                    }
                    const newOrganization = yield organizationQuery.saveOrganization(queryRunner.manager, null);
                    user = queryRunner.manager.getRepository(User_entity_1.User).create({
                        google_oauth_id: googleId,
                        email,
                        full_name: name,
                        is_email_verified: email_verified ? 1 : 0,
                        org_id: newOrganization.org_id,
                        is_admin: 1,
                    });
                    yield queryRunner.manager.save(user);
                    yield organizationQuery.updateOrganization(queryRunner.manager, newOrganization.org_id, { owner_id: user.user_id });
                    if (!email_verified) {
                        yield otpService.generateSaveAndSendOtp(user.user_id, {
                            email: user.email,
                            medium: otpMedium_1.OtpMedium.EMAIL,
                            otp_type: otpType_1.OtpType.EMAIL_VERIFICATION,
                        });
                    }
                }
                const token = (0, jwt_1.jwtSign)(user.user_id, user.org_id, user.email, undefined, user.is_super_admin, user.is_admin);
                const refreshToken = yield (0, jwt_1.generateRefreshToken)(user.user_id);
                yield this.saveRefreshToken(queryRunner.manager, user.user_id, refreshToken);
                yield userQuery.saveToken(queryRunner.manager, {
                    id: token,
                    userId: user.user_id,
                    ttl: this.ttl,
                    scopes: "user",
                    status: 1,
                    active: 1,
                });
                const getUserByIdWithOrganization = yield organizationQuery.getUserByIdWithOrganization(queryRunner.manager, user.user_id);
                const { password_hash } = getUserByIdWithOrganization, safeUser = __rest(getUserByIdWithOrganization, ["password_hash"]);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: {
                        token,
                        refreshToken,
                        user: safeUser,
                        organization: getUserByIdWithOrganization.organization,
                    },
                    message: "Login successful",
                };
            }
            catch (err) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.BAD_REQUEST,
                    message: "Google authentication failed",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    signup(param) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                if (!param.email ||
                    !param.password ||
                    !param.first_name ||
                    !param.last_name ||
                    !param.phone_no) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Missing required fields",
                    };
                }
                const existingUser = yield userQuery.findUserByEmail(queryRunner.manager, param.email);
                if (existingUser) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Email is already registered",
                    };
                }
                const passwordhash = yield (0, bcrypt_1.passwordHash)(param.password);
                const newOrganization = yield organizationQuery.saveOrganization(queryRunner.manager, param.org_name);
                let role_id;
                const role = yield roleQuery.getRoleByNameAndOrgId(queryRunner.manager, roles_1.Roles.ADMIN, null);
                if (role) {
                    role_id = role.role_id;
                }
                else {
                    const newRole = yield roleQuery.saveRole(queryRunner.manager, {
                        role_name: roles_1.Roles.ADMIN,
                        created_by: "system",
                        org_id: undefined,
                    });
                    role_id = newRole.role_id;
                }
                const newUser = yield userQuery.addUser(queryRunner.manager, Object.assign(Object.assign({}, param), { password_hash: passwordhash, org_id: newOrganization.org_id, is_admin: 1, phone: param.phone_no, role_id: role_id }));
                yield organizationQuery.updateOrganization(queryRunner.manager, newOrganization.org_id, { owner_id: newUser.user_id });
                yield otpService.generateSaveAndSendOtp(newUser.user_id, {
                    email: newUser.email,
                    medium: otpMedium_1.OtpMedium.EMAIL,
                    otp_type: otpType_1.OtpType.EMAIL_VERIFICATION,
                });
                const token = (0, jwt_1.jwtSign)(newUser.user_id, newOrganization.org_id, newUser.email, role_id, newUser.is_super_admin, newUser.is_admin);
                yield userQuery.saveToken(queryRunner.manager, {
                    id: token,
                    userId: newUser.user_id,
                    ttl: this.ttl,
                    scopes: "user",
                    status: 1,
                    active: 1,
                });
                const getUserByIdWithOrganization = yield organizationQuery.getUserByIdWithOrganization(queryRunner.manager, newUser.user_id);
                const { password_hash } = getUserByIdWithOrganization, safeUser = __rest(getUserByIdWithOrganization, ["password_hash"]);
                const refreshToken = yield (0, jwt_1.generateRefreshToken)(newUser.user_id);
                yield this.saveRefreshToken(queryRunner.manager, newUser.user_id, refreshToken);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.CREATED,
                    data: {
                        token,
                        refreshToken,
                        user: safeUser,
                        organization: getUserByIdWithOrganization.organization,
                    },
                    message: "User created, OTP sent successfully!!",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: "Internal server error",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    verifyOTP(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const isVerified = yield otpService.verifyOtp(params.id, params.otp, params.otp_type);
                if (!isVerified) {
                    return {
                        status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                        message: "Invalid or expired OTP",
                    };
                }
                return {
                    status: http_status_codes_1.default.OK,
                    data: null,
                    message: "Verify successful",
                };
            }
            catch (error) {
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: "Internal server error",
                };
            }
        });
    }
    logout(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const payload = yield (0, jwt_1.jwtVerify)(accessToken);
                const user = yield queryRunner.manager.getRepository(User_entity_1.User).findOne({
                    where: { user_id: payload.user_id },
                });
                if (!user) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "User not found",
                        data: null,
                    };
                }
                yield userTokenQuery.deleteTokenFromDatabase(accessToken);
                yield queryRunner.manager.getRepository(RefreshToken_entity_1.RefreshToken).delete({
                    user_id: payload.user_id,
                });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    message: "Logout successful",
                    data: null,
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.UNAUTHORIZED,
                    message: "Invalid or expired token",
                    data: null,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    forgotPassword(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                const user = yield userQuery.findByEmail(email);
                if (!user) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 404, message: "User not found", data: null };
                }
                if (!user.is_email_verified) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 404, message: "Email not verified", data: null };
                }
                const token = yield (0, jwt_1.jwtSign)(user.user_id, user.org_id, email, user.role_id, user.is_super_admin, user.is_admin);
                const params = {
                    otp: token,
                    email: email,
                    otp_type: otpType_1.OtpType.PASSWORD_RESET,
                    medium: otpMedium_1.OtpMedium.EMAIL,
                    user_id: user.user_id,
                };
                const userTokenData = yield otpService.saveOtpOrLink(queryRunner.manager, params);
                if (!userTokenData) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 404, message: "User token not found", data: null };
                }
                const resetLink = `${process.env.FORNTEND_URL || "https://field-sales-admin.vercel.app/auth/set-new-password/"}?token=${token}`;
                try {
                    yield this.sendPasswordResetNotification(email, resetLink);
                    yield queryRunner.commitTransaction();
                    return { status: 200, message: "Reset link sent to email", data: null };
                }
                catch (emailError) {
                    yield queryRunner.rollbackTransaction();
                    console.error("Failed to send reset email:", emailError);
                    return {
                        status: 500,
                        message: "Failed to send reset email. Please check your email configuration or try again later.",
                        data: null
                    };
                }
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return { status: 500, message: "Internal server error", data: null };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    resetPassword(_a, userFromSession_1) {
        return __awaiter(this, arguments, void 0, function* ({ token, oldPassword, newPassword, org_id, user_id, }, userFromSession) {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            let orgId;
            try {
                yield queryRunner.startTransaction();
                let user;
                // Case 1: Reset via token link
                if (token) {
                    try {
                        const payload = yield (0, jwt_1.jwtVerify)(token);
                        const tokenData = yield otpService.verifyOtp(payload.user_id, token, otpType_1.OtpType.PASSWORD_RESET);
                        orgId = payload.org_id;
                        if (!tokenData) {
                            throw new Error("Invalid token or user not found");
                        }
                        user = yield userQuery.findById(payload.user_id);
                        if (!user) {
                            yield queryRunner.rollbackTransaction();
                            return { status: 404, message: "User not found", data: null };
                        }
                        if (!user.is_email_verified) {
                            yield queryRunner.rollbackTransaction();
                            return { status: 404, message: "Email not verified", data: null };
                        }
                    }
                    catch (err) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: 400,
                            message: "Invalid or expired token",
                            data: null,
                        };
                    }
                }
                else {
                    // Case 2: Change password from profile using old password
                    user = yield userQuery.findById(user_id);
                    orgId = org_id;
                    if (!user) {
                        yield queryRunner.rollbackTransaction();
                        return { status: 401, message: "Unauthorized", data: null };
                    }
                    const isMatch = yield (0, bcrypt_1.passwordCompare)(oldPassword, user.password_hash);
                    if (!isMatch) {
                        yield queryRunner.rollbackTransaction();
                        return { status: 400, message: "Incorrect old password", data: null };
                    }
                }
                const hashedPassword = yield (0, bcrypt_1.passwordHash)(newPassword);
                const updatedUser = yield userQuery.updateUser(queryRunner.manager, orgId, user.user_id, {
                    password_hash: hashedPassword,
                });
                if (!updatedUser) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 400, message: "User update failed", data: null };
                }
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    message: "Password updated successfully",
                    data: null,
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: "Internal server error",
                    data: null,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
}
exports.AuthService = AuthService;
