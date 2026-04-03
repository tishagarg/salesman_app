"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerritoryController = void 0;
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const territory_service_1 = require("../service/territory.service");
const api_response_1 = require("../utils/api.response");
const Territory_entity_1 = require("../models/Territory.entity");
const TerritorySalesMan_entity_1 = require("../models/TerritorySalesMan.entity");
const data_source_1 = require("../config/data-source");
const territoryService = new territory_service_1.TerritoryService();
class TerritoryController {
    addTerritory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = req.body;
            const { user_id, org_id } = req.user;
            const result = yield territoryService.addTerritory(data, parseInt(user_id), org_id);
            res.status(result.status).json(result);
        });
    }
    unAssignSalesManFromTerritory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const { territory_id, salesRepIds } = req.body;
            if (!territory_id ||
                !Array.isArray(salesRepIds) ||
                salesRepIds.length === 0) {
                res.status(400).json({
                    message: "Invalid request. Please provide territory_id and salesRepIds.",
                });
                return;
            }
            // Enforce one-to-one: only process the first salesman ID
            if (salesRepIds.length > 1) {
                res.status(400).json({
                    message: "Only one salesman can be assigned to a territory. Please provide a single salesman ID.",
                });
                return;
            }
            const territorySalesmanRepo = dataSource.getRepository(TerritorySalesMan_entity_1.TerritorySalesman);
            const territoryRepo = dataSource.getRepository(Territory_entity_1.Territory);
            try {
                const salesman_id = salesRepIds[0];
                // Delete the one-to-one relationship
                const deleteResult = yield territorySalesmanRepo.delete({
                    territory_id,
                    salesman_id
                });
                if (deleteResult.affected === 0) {
                    res.status(404).json({
                        message: `No assignment found for salesman ${salesman_id} in territory ${territory_id}.`,
                    });
                    return;
                }
                // With one-to-one constraint, after unassigning, the territory will have no salesman
                // Optionally delete the territory if no salesman is assigned
                const remainingSalesmen = yield territorySalesmanRepo.find({
                    where: { territory_id },
                });
                if (remainingSalesmen.length === 0) {
                    // Optionally delete territory if no salesman is assigned
                    // Uncomment the following lines if you want to auto-delete territories without salesmen
                    // await territoryRepo.update(
                    //   { territory_id },
                    //   { is_active: false }
                    // );
                    res.status(200).json({
                        message: `Salesman unassigned from territory (ID: ${territory_id}). Territory now has no assigned salesman.`,
                    });
                }
                else {
                    res.status(200).json({
                        message: `Salesman unassigned from territory (ID: ${territory_id}).`,
                    });
                }
            }
            catch (error) {
                console.error("Error in unAssignSalesManFromTerritory:", error);
                res.status(500).json({ message: "Internal server error." });
            }
        });
    }
    updateTerritory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const territoryId = parseInt(req.params.id);
            const data = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id;
            if (!userId) {
                res
                    .status(http_status_codes_1.default.UNAUTHORIZED)
                    .json({ message: "User not authenticated" });
            }
            const result = yield territoryService.updateTerritory(territoryId, data, parseInt(userId));
            res.status(result.status).json(result);
        });
    }
    deleteTerritory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const territoryId = parseInt(req.params.id);
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id;
            if (!userId) {
                res
                    .status(http_status_codes_1.default.UNAUTHORIZED)
                    .json({ message: "User not authenticated" });
            }
            const result = yield territoryService.deleteTerritory(territoryId, parseInt(userId));
            res.status(result.status).json(result);
        });
    }
    getTerritoryById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const territoryId = parseInt(req.params.id);
            const result = yield territoryService.getTerritoryById(territoryId);
            res.status(result.status).json(result);
        });
    }
    assignManagerToTerritory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { user_id, org_id } = req.user;
            const { manager_id, territory_ids } = req.body;
            const response = yield territoryService.assignManagerToTerritory({ user_id, org_id }, manager_id, territory_ids);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
    getAllTerritories(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { org_id } = req.user;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const salesmanId = req.query.salesmanId
                ? parseInt(req.query.salesmanId)
                : undefined;
            const result = yield territoryService.getAllTerritories({
                org_id,
                skip,
                limit,
                page,
                salesmanId,
            });
            if (result.status >= 400) {
                return api_response_1.ApiResponse.error(res, result.status, result.message);
            }
            return api_response_1.ApiResponse.result(res, (_a = result.data) !== null && _a !== void 0 ? _a : null, result.status, null, result.message, {
                currentPage: page,
                totalItems: result.total,
                totalPages: Math.ceil((result.total || 0) / limit),
                previousPage: page > 1 ? page - 1 : null,
                nextPage: result.total && page * limit < result.total ? page + 1 : null,
            });
        });
    }
    drawPolygon(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { name, geometry, org_id, territory_id } = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id;
            if (!userId) {
                res
                    .status(http_status_codes_1.default.UNAUTHORIZED)
                    .json({ message: "User not authenticated" });
            }
            if (!name || !geometry || !org_id) {
                res
                    .status(http_status_codes_1.default.BAD_REQUEST)
                    .json({ message: "Missing required fields" });
            }
            const result = yield territoryService.drawPolygon({
                name,
                geometry,
                org_id,
                territory_id,
                created_by: userId,
            });
            res.status(result.status).json(result);
        });
    }
    assignByPostalCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { postal_code, territory_id, org_id } = req.body;
            if (!postal_code || !territory_id || !org_id) {
                res
                    .status(http_status_codes_1.default.BAD_REQUEST)
                    .json({ message: "Missing required fields" });
            }
            const result = yield territoryService.assignByPostalCode(postal_code, territory_id, org_id);
            res.status(result.status).json(result);
        });
    }
    assignBySubregion(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { subregion, territory_id, org_id } = req.body;
            if (!subregion || !territory_id || !org_id) {
                res
                    .status(http_status_codes_1.default.BAD_REQUEST)
                    .json({ message: "Missing required fields" });
            }
            const result = yield territoryService.assignBySubregion(subregion, territory_id, org_id);
            res.status(result.status).json(result);
        });
    }
    manualOverride(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { address_id, territory_id, org_id } = req.body;
            if (!address_id || !territory_id || !org_id) {
                res
                    .status(http_status_codes_1.default.BAD_REQUEST)
                    .json({ message: "Missing required fields" });
            }
            const result = yield territoryService.manualOverride(address_id, territory_id, org_id);
            res.status(result.status).json(result);
        });
    }
    autoAssignTerritory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = yield dataSource.createQueryRunner();
            try {
                const { address_id, org_id } = req.body;
                if (!address_id || !org_id) {
                    res
                        .status(http_status_codes_1.default.BAD_REQUEST)
                        .json({ message: "Missing required fields" });
                    return;
                }
                const result = yield territoryService.autoAssignTerritory(address_id, org_id, queryRunner);
                res.status(result.status).json(result);
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
}
exports.TerritoryController = TerritoryController;
