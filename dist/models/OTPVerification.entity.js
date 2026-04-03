"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpVerification = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
const otpType_1 = require("../enum/otpType");
const otpMedium_1 = require("../enum/otpMedium");
let OtpVerification = class OtpVerification {
};
exports.OtpVerification = OtpVerification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], OtpVerification.prototype, "otp_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], OtpVerification.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, (user) => user.user_id),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_entity_1.User)
], OtpVerification.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500 }),
    __metadata("design:type", String)
], OtpVerification.prototype, "otp", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: otpType_1.OtpType,
        default: otpType_1.OtpType.NULL,
        enumName: "otp_verification_otp_type_enum",
    }),
    __metadata("design:type", String)
], OtpVerification.prototype, "otp_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: otpMedium_1.OtpMedium,
        enumName: "otp_verification_medium_enum",
        default: otpMedium_1.OtpMedium.EMAIL,
    }),
    __metadata("design:type", String)
], OtpVerification.prototype, "medium", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], OtpVerification.prototype, "is_used", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], OtpVerification.prototype, "expires_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OtpVerification.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], OtpVerification.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], OtpVerification.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], OtpVerification.prototype, "updated_by", void 0);
exports.OtpVerification = OtpVerification = __decorate([
    (0, typeorm_1.Entity)("otp_verification"),
    (0, typeorm_1.Index)("idx_user_id", ["user_id"]),
    (0, typeorm_1.Index)("idx_otp", ["otp"])
], OtpVerification);
