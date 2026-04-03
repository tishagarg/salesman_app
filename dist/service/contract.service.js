"use strict";
// services/contractTemplate.service.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractTemplateService = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const User_entity_1 = require("../models/User.entity");
const ContractTemplate_entity_1 = require("../models/ContractTemplate.entity");
const ManagerSalesRep_entity_1 = require("../models/ManagerSalesRep.entity");
const Contracts_entity_1 = require("../models/Contracts.entity");
exports.ContractTemplateService = {
    createContractTemplate(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const userRepo = queryRunner.manager.getRepository(User_entity_1.User);
                const contractRepo = queryRunner.manager.getRepository(ContractTemplate_entity_1.ContractTemplate);
                const managers = yield userRepo.find({
                    where: { user_id: (0, typeorm_1.In)(payload.assigned_manager_ids) },
                });
                const newTemplate = contractRepo.create({
                    title: payload.title,
                    content: payload.content,
                    status: payload.status,
                    assigned_managers: managers,
                    dropdown_fields: payload.dropdown_fields || undefined,
                });
                const savedTemplate = yield contractRepo.save(newTemplate);
                yield queryRunner.commitTransaction();
                return {
                    status: 201,
                    data: savedTemplate,
                    message: "Contract template created successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: "Failed to create contract template",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    },
    getAllContracts(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const contractRepo = queryRunner.manager.getRepository(Contracts_entity_1.Contract);
                let query = contractRepo
                    .createQueryBuilder("contract")
                    .leftJoinAndSelect("contract.template", "template")
                    .leftJoinAndSelect("contract.visit", "visit")
                    .leftJoinAndSelect("visit.rep", "rep")
                    .leftJoinAndSelect("visit.lead", "lead");
                if (filters.managerId) {
                    query = query
                        .leftJoin("template.assigned_managers", "manager")
                        .andWhere("manager.user_id = :managerId", {
                        managerId: filters.managerId,
                    });
                }
                if (filters.status) {
                    query = query.andWhere("template.status = :status", {
                        status: filters.status,
                    });
                }
                if (filters.search) {
                    query = query.andWhere("LOWER(template.title) ILIKE :search", {
                        search: `%${filters.search.toLowerCase()}%`,
                    });
                }
                if (filters.sortBy === "signedCount") {
                    query = query.orderBy("template.total_signed", "DESC");
                }
                else if (filters.sortBy === "title") {
                    query = query.orderBy("template.title", "ASC");
                }
                else {
                    query = query.orderBy("contract.signed_at", "DESC");
                }
                const [contracts, total] = yield query
                    .skip(filters.skip || 0)
                    .take(filters.limit || 10)
                    .getManyAndCount();
                yield queryRunner.commitTransaction();
                return {
                    data: contracts,
                    status: 200,
                    message: "Contracts fetched successfully",
                    total,
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    data: null,
                    status: 500,
                    message: "Error fetching contracts",
                    total: 0,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    },
    listContractTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = yield dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const contracts = yield queryRunner.manager.find(ContractTemplate_entity_1.ContractTemplate, {
                    relations: { assigned_managers: true },
                    order: { updated_at: "DESC" },
                });
                yield queryRunner.commitTransaction();
                return {
                    data: contracts,
                    status: 200,
                    message: "Contracts fetched successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    data: null,
                    status: 500,
                    message: "Error fetching contracts",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    },
    getTemplatesForSalesRep(repId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = yield dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const dataSource = yield (0, data_source_1.getDataSource)();
                const templateRepo = dataSource.getRepository(ContractTemplate_entity_1.ContractTemplate);
                const managerMappings = yield dataSource
                    .getRepository(ManagerSalesRep_entity_1.ManagerSalesRep)
                    .find({
                    where: { sales_rep: { user_id: repId } },
                    relations: { manager: true },
                });
                const managerIds = managerMappings.map((m) => m.manager.user_id);
                if (managerIds.length === 0) {
                    yield queryRunner.rollbackTransaction();
                    return { data: [], status: 404, message: "No managers found" };
                }
                const templates = yield templateRepo
                    .createQueryBuilder("template")
                    .leftJoin("template.assigned_managers", "manager")
                    .where("manager.user_id IN (:...managerIds)", { managerIds })
                    .getMany();
                yield queryRunner.commitTransaction();
                return {
                    data: templates,
                    message: "Templates fetched successfully",
                    status: 200,
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    data: null,
                    message: "Error fetching templates",
                    status: 500,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    },
    reassignContractTemplate(templateId, assigned_manager_ids) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const userRepo = queryRunner.manager.getRepository(User_entity_1.User);
                const contractRepo = queryRunner.manager.getRepository(ContractTemplate_entity_1.ContractTemplate);
                // Find the existing template
                const existingTemplate = yield contractRepo.findOne({
                    where: { id: templateId },
                    relations: { assigned_managers: true },
                });
                if (!existingTemplate) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "Contract template not found",
                    };
                }
                // Find the new managers to assign
                const managers = yield userRepo.find({
                    where: { user_id: (0, typeorm_1.In)(assigned_manager_ids) },
                });
                if (managers.length !== assigned_manager_ids.length) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 400,
                        message: "One or more manager IDs are invalid",
                    };
                }
                // Update the assigned managers
                existingTemplate.assigned_managers = managers;
                existingTemplate.updated_at = new Date();
                const updatedTemplate = yield contractRepo.save(existingTemplate);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: updatedTemplate,
                    message: "Contract template reassigned successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error reassigning contract template:", error);
                return {
                    status: 500,
                    message: "Failed to reassign contract template",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    },
    updateContractTemplate(templateId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const userRepo = queryRunner.manager.getRepository(User_entity_1.User);
                const contractRepo = queryRunner.manager.getRepository(ContractTemplate_entity_1.ContractTemplate);
                // Find the existing template
                const existingTemplate = yield contractRepo.findOne({
                    where: { id: templateId },
                    relations: { assigned_managers: true },
                });
                if (!existingTemplate) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "Contract template not found",
                    };
                }
                // Update basic fields
                if (updates.title !== undefined) {
                    existingTemplate.title = updates.title;
                }
                if (updates.content !== undefined) {
                    existingTemplate.content = updates.content;
                }
                if (updates.status !== undefined) {
                    existingTemplate.status = updates.status;
                }
                if (updates.dropdown_fields !== undefined) {
                    existingTemplate.dropdown_fields = updates.dropdown_fields;
                }
                // Update assigned managers if provided
                if (updates.assigned_manager_ids) {
                    const managers = yield userRepo.find({
                        where: { user_id: (0, typeorm_1.In)(updates.assigned_manager_ids) },
                    });
                    if (managers.length !== updates.assigned_manager_ids.length) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: 400,
                            message: "One or more manager IDs are invalid",
                        };
                    }
                    existingTemplate.assigned_managers = managers;
                }
                existingTemplate.updated_at = new Date();
                const updatedTemplate = yield contractRepo.save(existingTemplate);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: updatedTemplate,
                    message: "Contract template updated successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error updating contract template:", error);
                return {
                    status: 500,
                    message: "Failed to update contract template",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    },
    getContractTemplateById(templateId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataSource = yield (0, data_source_1.getDataSource)();
                const contractRepo = dataSource.getRepository(ContractTemplate_entity_1.ContractTemplate);
                const template = yield contractRepo.findOne({
                    where: { id: templateId },
                    relations: { assigned_managers: true },
                });
                if (!template) {
                    return {
                        data: null,
                        status: 404,
                        message: "Contract template not found",
                    };
                }
                return {
                    data: template,
                    status: 200,
                    message: "Contract template fetched successfully",
                };
            }
            catch (error) {
                console.error("Error fetching contract template:", error);
                return {
                    data: null,
                    status: 500,
                    message: "Failed to fetch contract template",
                };
            }
        });
    },
    deleteContract(contractId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const contractRepo = queryRunner.manager.getRepository(Contracts_entity_1.Contract);
                // Find the contract with all related data
                const contract = yield contractRepo.findOne({
                    where: { id: contractId },
                    relations: ["images", "pdf", "visit"],
                });
                if (!contract) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "Contract not found",
                    };
                }
                // Delete related contract images (cascade should handle this, but explicit for safety)
                if (contract.images && contract.images.length > 0) {
                    yield queryRunner.manager.delete("contract_images", {
                        contract_id: contractId,
                    });
                }
                // Delete related contract PDF (cascade should handle this, but explicit for safety)
                if (contract.pdf) {
                    yield queryRunner.manager.delete("contract_pdfs", {
                        contract_id: contractId,
                    });
                }
                // Update the visit to remove contract association
                if (contract.visit) {
                    yield queryRunner.manager.update("visits", { visit_id: contract.visit_id }, { contract_id: null });
                }
                // Finally, delete the contract itself
                yield queryRunner.manager.delete("contracts", { id: contractId });
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    message: "Contract deleted successfully",
                    data: { contractId },
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error deleting contract:", error);
                return {
                    status: 500,
                    message: "Failed to delete contract",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    },
};
