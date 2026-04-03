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
exports.FollowUpVisit = void 0;
const typeorm_1 = require("typeorm");
const Visits_entity_1 = require("./Visits.entity");
const FollowUp_entity_1 = require("./FollowUp.entity");
let FollowUpVisit = class FollowUpVisit {
};
exports.FollowUpVisit = FollowUpVisit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], FollowUpVisit.prototype, "follow_up_visit_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], FollowUpVisit.prototype, "follow_up_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], FollowUpVisit.prototype, "visit_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => FollowUp_entity_1.FollowUp, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "follow_up_id" }),
    __metadata("design:type", FollowUp_entity_1.FollowUp)
], FollowUpVisit.prototype, "followUp", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Visits_entity_1.Visit, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "visit_id" }),
    __metadata("design:type", Visits_entity_1.Visit)
], FollowUpVisit.prototype, "visit", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], FollowUpVisit.prototype, "created_at", void 0);
exports.FollowUpVisit = FollowUpVisit = __decorate([
    (0, typeorm_1.Entity)("follow_up_visit")
], FollowUpVisit);
