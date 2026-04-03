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
exports.Address = void 0;
const typeorm_1 = require("typeorm");
const Territory_entity_1 = require("./Territory.entity");
const Organisation_entity_1 = require("./Organisation.entity");
const Polygon_entity_1 = require("./Polygon.entity");
let Address = class Address {
};
exports.Address = Address;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Address.prototype, "address_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Address.prototype, "street_address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], Address.prototype, "building_unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Address.prototype, "landmark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Address.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Address.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 6 }),
    __metadata("design:type", String)
], Address.prototype, "postal_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100 }),
    __metadata("design:type", String)
], Address.prototype, "area_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100 }),
    __metadata("design:type", String)
], Address.prototype, "subregion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100 }),
    __metadata("design:type", String)
], Address.prototype, "region", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "Finland" }),
    __metadata("design:type", String)
], Address.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float" }),
    __metadata("design:type", Number)
], Address.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float" }),
    __metadata("design:type", Number)
], Address.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Address.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Object)
], Address.prototype, "territory_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Object)
], Address.prototype, "polygon_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Address.prototype, "org_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], Address.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Address.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 36, nullable: true }),
    __metadata("design:type", String)
], Address.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Address.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Address.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Territory_entity_1.Territory, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "territory_id" }),
    __metadata("design:type", Territory_entity_1.Territory)
], Address.prototype, "territory", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Polygon_entity_1.Polygon, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "polygon_id" }),
    __metadata("design:type", Polygon_entity_1.Polygon)
], Address.prototype, "polygon", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Organisation_entity_1.Organization, { onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "org_id" }),
    __metadata("design:type", Organisation_entity_1.Organization)
], Address.prototype, "organization", void 0);
exports.Address = Address = __decorate([
    (0, typeorm_1.Entity)("address"),
    (0, typeorm_1.Index)("unique_address", ["postal_code", "street_address", "subregion"], {
        unique: true,
    })
], Address);
