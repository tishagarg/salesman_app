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
exports.ContractPDF = void 0;
const typeorm_1 = require("typeorm");
const Contracts_entity_1 = require("./Contracts.entity");
let ContractPDF = class ContractPDF {
};
exports.ContractPDF = ContractPDF;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ContractPDF.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContractPDF.prototype, "contract_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contracts_entity_1.Contract, (contract) => contract.id),
    (0, typeorm_1.JoinColumn)({ name: "contract_id" }),
    __metadata("design:type", Contracts_entity_1.Contract)
], ContractPDF.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "bytea" }),
    __metadata("design:type", Buffer)
], ContractPDF.prototype, "pdf_data", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" }),
    __metadata("design:type", Date)
], ContractPDF.prototype, "created_at", void 0);
exports.ContractPDF = ContractPDF = __decorate([
    (0, typeorm_1.Entity)("contract_pdfs")
], ContractPDF);
