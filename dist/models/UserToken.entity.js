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
exports.UserToken = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
let UserToken = class UserToken {
};
exports.UserToken = UserToken;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "varchar", length: 500 }),
    __metadata("design:type", String)
], UserToken.prototype, "user_token_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], UserToken.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], UserToken.prototype, "ttl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], UserToken.prototype, "scopes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", Number)
], UserToken.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], UserToken.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], UserToken.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], UserToken.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], UserToken.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { cascade: true }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_entity_1.User)
], UserToken.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], UserToken.prototype, "is_active", void 0);
exports.UserToken = UserToken = __decorate([
    (0, typeorm_1.Entity)("user_token")
], UserToken);
