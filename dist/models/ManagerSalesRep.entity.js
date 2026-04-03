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
exports.ManagerSalesRep = void 0;
const typeorm_1 = require("typeorm");
const User_entity_1 = require("./User.entity");
let ManagerSalesRep = class ManagerSalesRep {
};
exports.ManagerSalesRep = ManagerSalesRep;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ManagerSalesRep.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], ManagerSalesRep.prototype, "manager_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], ManagerSalesRep.prototype, "sales_rep_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "manager_id" }),
    __metadata("design:type", User_entity_1.User)
], ManagerSalesRep.prototype, "manager", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_entity_1.User, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "sales_rep_id" }),
    __metadata("design:type", User_entity_1.User)
], ManagerSalesRep.prototype, "sales_rep", void 0);
exports.ManagerSalesRep = ManagerSalesRep = __decorate([
    (0, typeorm_1.Entity)("manager_sales_rep")
], ManagerSalesRep);
