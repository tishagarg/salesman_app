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
exports.Contract = void 0;
const typeorm_1 = require("typeorm");
const Visits_entity_1 = require("./Visits.entity");
const ContractTemplate_entity_1 = require("./ContractTemplate.entity");
const ContractImage_entity_1 = require("./ContractImage.entity");
const ContractPdf_entity_1 = require("./ContractPdf.entity");
let Contract = class Contract {
};
exports.Contract = Contract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Contract.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Contract.prototype, "contract_template_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ContractTemplate_entity_1.ContractTemplate),
    (0, typeorm_1.JoinColumn)({ name: "contract_template_id" }),
    __metadata("design:type", ContractTemplate_entity_1.ContractTemplate)
], Contract.prototype, "template", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], Contract.prototype, "visit_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Visits_entity_1.Visit, (visit) => visit.contract),
    (0, typeorm_1.JoinColumn)({ name: "visit_id" }),
    __metadata("design:type", Visits_entity_1.Visit)
], Contract.prototype, "visit", void 0);
__decorate([
    (0, typeorm_1.Column)("text"),
    __metadata("design:type", String)
], Contract.prototype, "rendered_html", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], Contract.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" }),
    __metadata("design:type", Date)
], Contract.prototype, "signed_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ContractImage_entity_1.ContractImage, (image) => image.contract),
    __metadata("design:type", Array)
], Contract.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => ContractPdf_entity_1.ContractPDF, (pdf) => pdf.contract),
    __metadata("design:type", ContractPdf_entity_1.ContractPDF)
], Contract.prototype, "pdf", void 0);
exports.Contract = Contract = __decorate([
    (0, typeorm_1.Entity)("contracts")
], Contract);
