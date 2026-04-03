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
exports.Route = void 0;
// src/models/Route.entity.ts
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
let Route = class Route {
};
exports.Route = Route;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Route.prototype, "route_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], Route.prototype, "rep_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date" }),
    __metadata("design:type", Date)
], Route.prototype, "route_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json" }) // Store ordered list of customer IDs with metadata
    ,
    __metadata("design:type", Array)
], Route.prototype, "route_order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Route.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Route.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Route.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Route.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Route.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "rep_id" }),
    __metadata("design:type", User_entity_1.User)
], Route.prototype, "rep", void 0);
exports.Route = Route = __decorate([
    (0, typeorm_1.Entity)("route")
], Route);
