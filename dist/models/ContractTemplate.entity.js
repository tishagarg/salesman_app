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
exports.ContractTemplate = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
let ContractTemplate = class ContractTemplate {
};
exports.ContractTemplate = ContractTemplate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ContractTemplate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], ContractTemplate.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text" }),
    __metadata("design:type", String)
], ContractTemplate.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", default: "active" }),
    __metadata("design:type", String)
], ContractTemplate.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], ContractTemplate.prototype, "dropdown_fields", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => User_entity_1.User),
    (0, typeorm_1.JoinTable)({
        name: "contract_template_managers",
        joinColumn: { name: "contract_template_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "manager_id", referencedColumnName: "user_id" },
    }),
    __metadata("design:type", Array)
], ContractTemplate.prototype, "assigned_managers", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ContractTemplate.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ContractTemplate.prototype, "updated_at", void 0);
exports.ContractTemplate = ContractTemplate = __decorate([
    (0, typeorm_1.Entity)("contract_templates")
], ContractTemplate);
