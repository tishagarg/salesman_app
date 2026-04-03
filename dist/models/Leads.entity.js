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
exports.Leads = void 0;
const typeorm_1 = require("typeorm");
const leadStatus_1 = require("../enum/leadStatus");
const User_entity_1 = require("./User.entity");
const Address_entity_1 = require("./Address.entity");
const Organisation_entity_1 = require("./Organisation.entity");
// Entities
let Leads = class Leads {
};
exports.Leads = Leads;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Leads.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Leads.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Leads.prototype, "address_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Leads.prototype, "assigned_rep_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Leads.prototype, "contact_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Leads.prototype, "contact_email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 15, nullable: true }),
    __metadata("design:type", String)
], Leads.prototype, "contact_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: leadStatus_1.LeadStatus,
        enumName: "lead_status_enum",
        default: leadStatus_1.LeadStatus.Prospect,
    }),
    __metadata("design:type", String)
], Leads.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Object)
], Leads.prototype, "territory_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Leads.prototype, "org_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Leads.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Leads.prototype, "is_visited", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Leads.prototype, "pending_assignment", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: leadStatus_1.Source,
        enumName: "data_source_enum",
        default: null,
    }),
    __metadata("design:type", String)
], Leads.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Leads.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Leads.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Leads.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Leads.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "assigned_rep_id" }),
    __metadata("design:type", User_entity_1.User)
], Leads.prototype, "assigned_rep", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Address_entity_1.Address, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "address_id" }),
    __metadata("design:type", Address_entity_1.Address)
], Leads.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organisation_entity_1.Organization, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "org_id" }),
    __metadata("design:type", Organisation_entity_1.Organization)
], Leads.prototype, "organization", void 0);
exports.Leads = Leads = __decorate([
    (0, typeorm_1.Entity)("leads")
], Leads);
