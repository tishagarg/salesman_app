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
exports.Visit = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
const Leads_entity_1 = require("./Leads.entity");
const Contracts_entity_1 = require("./Contracts.entity");
const FollowUpVisit_entity_1 = require("./FollowUpVisit.entity");
const leadStatus_1 = require("../enum/leadStatus");
let Visit = class Visit {
};
exports.Visit = Visit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Visit.prototype, "visit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], Visit.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], Visit.prototype, "rep_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp" }),
    __metadata("design:type", Date)
], Visit.prototype, "check_in_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Visit.prototype, "check_out_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Visit.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Visit.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Visit.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb", nullable: true }),
    __metadata("design:type", Array)
], Visit.prototype, "photo_urls", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Visit.prototype, "next_visit_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: "500", nullable: true }),
    __metadata("design:type", String)
], Visit.prototype, "action_required", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Visit.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Visit.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Visit.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Visit.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Visit.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Leads_entity_1.Leads, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "lead_id" }),
    __metadata("design:type", Leads_entity_1.Leads)
], Visit.prototype, "lead", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => Contracts_entity_1.Contract, (contract) => contract.visit, { cascade: true }),
    __metadata("design:type", Contracts_entity_1.Contract)
], Visit.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "rep_id" }),
    __metadata("design:type", User_entity_1.User)
], Visit.prototype, "rep", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => FollowUpVisit_entity_1.FollowUpVisit, (followUpVisit) => followUpVisit.visit),
    __metadata("design:type", Array)
], Visit.prototype, "followUpVisits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], Visit.prototype, "status", void 0);
exports.Visit = Visit = __decorate([
    (0, typeorm_1.Entity)("visit")
], Visit);
