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
exports.User = void 0;
const Organisation_entity_1 = require("./Organisation.entity");
const typeorm_1 = require("typeorm");
const Role_entity_1 = require("./Role.entity");
const Address_entity_1 = require("./Address.entity");
const Visits_entity_1 = require("./Visits.entity");
const Leads_entity_1 = require("./Leads.entity");
const Message_entity_1 = require("./Message.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: false, unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "password_hash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 15, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "google_oauth_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", width: 1, default: false }),
    __metadata("design:type", Number)
], User.prototype, "is_email_verified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "full_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "first_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "last_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "number", nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "org_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "number", nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "role_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "number", nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "address_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Number)
], User.prototype, "is_admin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Number)
], User.prototype, "is_super_admin", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organisation_entity_1.Organization, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "org_id" }),
    __metadata("design:type", Object)
], User.prototype, "organization", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Address_entity_1.Address, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "address_id" }),
    __metadata("design:type", Object)
], User.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Role_entity_1.Role, { onDelete: "RESTRICT" }),
    (0, typeorm_1.JoinColumn)({ name: "role_id" }),
    __metadata("design:type", Role_entity_1.Role)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Leads_entity_1.Leads, (lead) => lead.assigned_rep),
    __metadata("design:type", Array)
], User.prototype, "leads", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Visits_entity_1.Visit, (visit) => visit.rep),
    __metadata("design:type", Array)
], User.prototype, "visits", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Message_entity_1.Message, (message) => message.sender),
    __metadata("design:type", Array)
], User.prototype, "sent_messages", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Message_entity_1.Message, (message) => message.receiver),
    __metadata("design:type", Array)
], User.prototype, "received_messages", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)("user"),
    (0, typeorm_1.Index)("idx_users_organization_id", ["org_id"])
], User);
