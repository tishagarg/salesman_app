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
exports.ContractImage = void 0;
const typeorm_1 = require("typeorm");
const Contracts_entity_1 = require("./Contracts.entity");
let ContractImage = class ContractImage {
};
exports.ContractImage = ContractImage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ContractImage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContractImage.prototype, "contract_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contracts_entity_1.Contract, (contract) => contract.images, {
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "contract_id" }),
    __metadata("design:type", Contracts_entity_1.Contract)
], ContractImage.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], ContractImage.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], ContractImage.prototype, "image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" }),
    __metadata("design:type", Date)
], ContractImage.prototype, "uploaded_at", void 0);
exports.ContractImage = ContractImage = __decorate([
    (0, typeorm_1.Entity)("contract_images")
], ContractImage);
