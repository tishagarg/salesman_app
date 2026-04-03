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
exports.TerritoryService = void 0;
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const data_source_1 = require("../config/data-source"); // Updated import
const Territory_entity_1 = require("../models/Territory.entity");
const common_interface_1 = require("../interfaces/common.interface");
const class_validator_1 = require("class-validator");
const Address_entity_1 = require("../models/Address.entity");
const Polygon_entity_1 = require("../models/Polygon.entity");
const turf_1 = require("@turf/turf");
const TerritorySalesMan_entity_1 = require("../models/TerritorySalesMan.entity");
const typeorm_1 = require("typeorm");
const geoCode_service_1 = require("../utils/geoCode.service");
const user_query_1 = require("../query/user.query");
const timezone_1 = require("../utils/timezone");
const geocodingService = new geoCode_service_1.GeocodingService();
const userQuery = new user_query_1.UserQuery();
class TerritoryService {
    drawPolygon(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const existingPolygon = yield queryRunner.manager.findOne(Polygon_entity_1.Polygon, {
                    where: { name: data.name, org_id: data.org_id },
                });
                if (existingPolygon) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.CONFLICT,
                        message: `Polygon with name ${data.name} already exists`,
                    };
                }
                if (data.territory_id) {
                    const territory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                        where: {
                            territory_id: data.territory_id,
                            org_id: data.org_id,
                            is_active: true,
                        },
                    });
                    if (!territory) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.NOT_FOUND,
                            message: "Territory not found",
                        };
                    }
                }
                const polygonEntity = new Polygon_entity_1.Polygon();
                polygonEntity.name = data.name;
                polygonEntity.geometry = data.geometry;
                polygonEntity.org_id = data.org_id;
                polygonEntity.created_by = data.created_by;
                polygonEntity.updated_by = data.created_by;
                const savedPolygon = yield queryRunner.manager.save(Polygon_entity_1.Polygon, polygonEntity);
                if (data.territory_id) {
                    yield queryRunner.manager.update(Territory_entity_1.Territory, { territory_id: data.territory_id }, { polygon_id: savedPolygon.polygon_id });
                }
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.CREATED,
                    data: savedPolygon,
                    message: "Polygon created successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to create polygon: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    assignTerritory(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const territories = yield queryRunner.manager.find(Territory_entity_1.Territory, {
                    where: { org_id: data.org_id, is_active: true },
                    relations: ["polygon"],
                });
                for (const territory of territories) {
                    const postalCodes = JSON.parse(territory.postal_codes || "[]");
                    const subregions = JSON.parse(territory.subregions || "[]");
                    if ((data.postal_code && postalCodes.includes(data.postal_code)) ||
                        (data.subregion && subregions.includes(data.subregion)) ||
                        (data.lat &&
                            data.lng &&
                            ((_a = territory.polygon) === null || _a === void 0 ? void 0 : _a.geometry) &&
                            (0, turf_1.booleanPointInPolygon)((0, turf_1.point)([data.lng, data.lat]), (0, turf_1.polygon)(territory.polygon.geometry.coordinates)))) {
                        yield queryRunner.commitTransaction();
                        return territory;
                    }
                }
                yield queryRunner.commitTransaction();
                return null;
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return null;
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    autoAssignTerritory(address_id, org_id, queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const address = yield queryRunner.manager.findOne(Address_entity_1.Address, {
                    where: { address_id, org_id, is_active: true },
                    lock: { mode: "pessimistic_write" }, // Add locking to prevent concurrency issues
                });
                if (!address) {
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: `Address not found: ${address_id}`,
                    };
                }
                const territory = yield this.assignTerritory({
                    postal_code: address.postal_code,
                    subregion: address.subregion,
                    lat: address.latitude,
                    lng: address.longitude,
                    org_id,
                });
                if (territory) {
                    if (address.territory_id === territory.territory_id &&
                        address.polygon_id === territory.polygon_id) {
                        return {
                            status: http_status_codes_1.default.OK,
                            data: address,
                            message: "Territory already assigned",
                        };
                    }
                    address.territory_id = territory.territory_id;
                    address.polygon_id = territory.polygon_id;
                    const updatedAddress = yield queryRunner.manager
                        .getRepository(Address_entity_1.Address)
                        .save(address);
                    return {
                        status: http_status_codes_1.default.OK,
                        data: updatedAddress,
                        message: "Territory auto-assigned",
                    };
                }
                return {
                    status: http_status_codes_1.default.OK,
                    data: address,
                    message: "No matching territory found",
                };
            }
            catch (error) {
                console.error("autoAssignTerritory - Error:", error.message, error.stack);
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to auto-assign territory: ${error.message}`,
                };
            }
        });
    }
    assignByPostalCode(postal_code, territory_id, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const territory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                    where: { territory_id, org_id, is_active: true },
                });
                if (!territory) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Territory not found",
                    };
                }
                yield queryRunner.manager.update(Address_entity_1.Address, { postal_code, org_id }, { territory_id, polygon_id: territory.polygon_id });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    message: "Territory assigned to addresses",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to assign territory: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    assignManagerToTerritory(userData, manager_id, territory_ids) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                // Verify the manager exists and belongs to the organization
                const manager = yield userQuery.getUserById(queryRunner.manager, userData.org_id, manager_id);
                if (!manager) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Manager not found",
                        data: null,
                    };
                }
                // Validate territory_ids
                if (!territory_ids || territory_ids.length === 0) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "No territory IDs provided",
                        data: null,
                    };
                }
                // Fetch territories to ensure they exist and belong to the organization
                const territories = yield queryRunner.manager.find(Territory_entity_1.Territory, {
                    where: {
                        territory_id: (0, typeorm_1.In)(territory_ids),
                        org_id: userData.org_id,
                        is_active: true,
                    },
                });
                // Check if all provided territory_ids exist
                const foundTerritoryIds = territories.map((t) => t.territory_id);
                const missingIds = territory_ids.filter((id) => !foundTerritoryIds.includes(id));
                if (missingIds.length > 0) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: `Territories with IDs ${missingIds.join(", ")} not found or do not belong to the organization`,
                        data: null,
                    };
                }
                // Update manager_id for each territory
                yield queryRunner.manager.update(Territory_entity_1.Territory, { territory_id: (0, typeorm_1.In)(territory_ids) }, {
                    manager_id,
                    updated_by: userData.user_id.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                });
                // Fetch updated territories for response
                const updatedTerritories = yield queryRunner.manager.find(Territory_entity_1.Territory, {
                    where: { territory_id: (0, typeorm_1.In)(territory_ids) },
                    relations: ["manager"],
                });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: updatedTerritories,
                    message: "Manager assigned to territories successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to assign manager to territories: ${error.message}`,
                    data: null,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    assignBySubregion(subregion, territory_id, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const territory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                    where: { territory_id, org_id, is_active: true },
                });
                if (!territory) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Territory not found",
                    };
                }
                yield queryRunner.manager.update(Address_entity_1.Address, { subregion, org_id }, { territory_id, polygon_id: territory.polygon_id });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    message: "Territory assigned to addresses",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to assign territory: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    manualOverride(address_id, territory_id, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const address = yield queryRunner.manager.findOneOrFail(Address_entity_1.Address, {
                    where: { address_id, org_id },
                });
                const territory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                    where: { territory_id, org_id, is_active: true },
                });
                if (!territory) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Territory not found",
                    };
                }
                address.territory_id = territory_id;
                address.polygon_id = territory.polygon_id;
                const updatedAddress = yield queryRunner.manager.save(Address_entity_1.Address, address);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: updatedAddress,
                    message: "Territory manually assigned",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to override territory: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    addTerritory(data, adminId, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                // Validate one-to-one constraint: only one salesman allowed
                if (data.salesmanIds && data.salesmanIds.length > 1) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Only one salesman can be assigned to a territory. Please provide a single salesman ID.",
                    };
                }
                // Check for existing territory
                const existing = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                    where: { name: data.name, org_id, is_active: true },
                    select: ["territory_id"],
                });
                if (existing) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.CONFLICT,
                        message: `Territory with name ${data.name} already exists`,
                    };
                }
                // Parse geometry early if provided
                let geometry;
                if (data.geometry) {
                    geometry =
                        typeof data.geometry === "string"
                            ? JSON.parse(data.geometry)
                            : data.geometry;
                    if (!Array.isArray(geometry) || geometry.length === 0) {
                        throw new Error("Invalid geometry format");
                    }
                }
                // Fetch location data for geometry if provided
                let fetchedLocationData = {
                    postal_codes: data.postal_codes || [],
                    regions: data.regions || [],
                    subregions: data.subregions || [],
                };
                let polygonId;
                if (geometry) {
                    fetchedLocationData =
                        yield geocodingService.getLocationDataFromCoordinates(geometry);
                    const polygon = queryRunner.manager.create(Polygon_entity_1.Polygon, {
                        name: data.name,
                        org_id,
                        created_by: adminId.toString(),
                        updated_by: adminId.toString(),
                        geometry: {
                            type: "Polygon",
                            coordinates: [
                                [
                                    ...geometry.map((coord) => [coord.lng, coord.lat]),
                                    [geometry[0].lng, geometry[0].lat],
                                ],
                            ],
                        },
                    });
                    const savedPolygon = yield queryRunner.manager.save(Polygon_entity_1.Polygon, polygon);
                    polygonId = savedPolygon.polygon_id;
                }
                // Create territory
                const territory = queryRunner.manager.create(Territory_entity_1.Territory, {
                    name: data.name,
                    postal_codes: JSON.stringify(fetchedLocationData.postal_codes.length > 0
                        ? fetchedLocationData.postal_codes
                        : data.postal_codes || []),
                    subregions: JSON.stringify(fetchedLocationData.subregions.length > 0
                        ? fetchedLocationData.subregions
                        : data.subregions || []),
                    regions: JSON.stringify(fetchedLocationData.regions.length > 0
                        ? fetchedLocationData.regions
                        : data.regions || []),
                    org_id,
                    manager_id: (_a = data.manager_id) !== null && _a !== void 0 ? _a : undefined,
                    polygon_id: polygonId,
                    is_active: true,
                    created_by: adminId.toString(),
                    updated_by: adminId.toString(),
                });
                let savedTerritory = yield queryRunner.manager.save(Territory_entity_1.Territory, territory);
                // Handle salesman assignment with one-to-one enforcement
                if ((_b = data.salesmanIds) === null || _b === void 0 ? void 0 : _b.length) {
                    const salesmanId = parseInt(data.salesmanIds[0], 10);
                    // Check if salesman is already assigned to another territory
                    const existingSalesmanAssignment = yield queryRunner.manager.findOne(TerritorySalesMan_entity_1.TerritorySalesman, {
                        where: { salesman_id: salesmanId },
                    });
                    if (existingSalesmanAssignment) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.CONFLICT,
                            message: `Salesman with ID ${salesmanId} is already assigned to territory ID ${existingSalesmanAssignment.territory_id}. Please unassign them first before assigning to a new territory.`,
                        };
                    }
                    // Check if territory already has a salesman (shouldn't happen for new territory, but safety check)
                    const existingTerritoryAssignment = yield queryRunner.manager.findOne(TerritorySalesMan_entity_1.TerritorySalesman, {
                        where: { territory_id: savedTerritory.territory_id },
                    });
                    if (existingTerritoryAssignment) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.CONFLICT,
                            message: `Territory ${savedTerritory.name} (ID: ${savedTerritory.territory_id}) already has salesman ID ${existingTerritoryAssignment.salesman_id} assigned. Please unassign them first.`,
                        };
                    }
                    // Create new one-to-one assignment
                    const territorySalesman = queryRunner.manager.create(TerritorySalesMan_entity_1.TerritorySalesman, {
                        territory_id: savedTerritory.territory_id,
                        salesman_id: salesmanId,
                    });
                    yield queryRunner.manager.save(TerritorySalesMan_entity_1.TerritorySalesman, territorySalesman);
                }
                if (data.manager_id) {
                    yield queryRunner.manager.update(Territory_entity_1.Territory, savedTerritory.territory_id, {
                        manager_id: data.manager_id,
                    });
                    const foundTerritory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                        where: { territory_id: savedTerritory.territory_id },
                    });
                    if (!foundTerritory) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                            message: "Failed to retrieve the updated territory after manager assignment.",
                        };
                    }
                    savedTerritory = foundTerritory;
                }
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.CREATED,
                    data: savedTerritory,
                    message: "Territory created successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to create territory: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    updateTerritory(territoryId, data, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const territory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                    where: {
                        territory_id: territoryId,
                        org_id: data.org_id,
                        is_active: true,
                    },
                });
                if (!territory) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Territory not found",
                    };
                }
                const territoryData = new common_interface_1.TerritoryDto();
                Object.assign(territoryData, Object.assign(Object.assign({}, territory), data));
                const validationErrors = yield (0, class_validator_1.validate)(territoryData);
                if (validationErrors.length) {
                    const errorMsg = validationErrors
                        .map((e) => Object.values(e.constraints || {}).join(", "))
                        .join("; ");
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: `Validation failed: ${errorMsg}`,
                    };
                }
                if (data.name && data.name !== territory.name) {
                    const existing = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                        where: { name: data.name, org_id: data.org_id, is_active: true },
                    });
                    if (existing && existing.territory_id !== territoryId) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.CONFLICT,
                            message: `Territory with name ${data.name} already exists`,
                        };
                    }
                }
                // Validate one-to-one constraint for salesman assignment
                if (data.salesmanIds && data.salesmanIds.length > 1) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Only one salesman can be assigned to a territory. Please provide a single salesman ID.",
                    };
                }
                // Handle salesman assignment update with one-to-one enforcement
                if (data.salesmanIds !== undefined) {
                    if (data.salesmanIds.length === 0) {
                        // Remove salesman assignment if empty array provided
                        yield queryRunner.manager.delete(TerritorySalesMan_entity_1.TerritorySalesman, {
                            territory_id: territoryId,
                        });
                    }
                    else {
                        const salesmanId = parseInt(data.salesmanIds[0], 10);
                        // Check if salesman is already assigned to another territory
                        const existingSalesmanAssignment = yield queryRunner.manager.findOne(TerritorySalesMan_entity_1.TerritorySalesman, {
                            where: { salesman_id: salesmanId },
                        });
                        if (existingSalesmanAssignment &&
                            existingSalesmanAssignment.territory_id !== territoryId) {
                            yield queryRunner.rollbackTransaction();
                            return {
                                status: http_status_codes_1.default.CONFLICT,
                                message: `Salesman with ID ${salesmanId} is already assigned to territory ID ${existingSalesmanAssignment.territory_id}. Please unassign them first before assigning to a new territory.`,
                            };
                        }
                        // Check if territory already has a salesman
                        const existingTerritoryAssignment = yield queryRunner.manager.findOne(TerritorySalesMan_entity_1.TerritorySalesman, {
                            where: { territory_id: territoryId },
                        });
                        if (existingTerritoryAssignment) {
                            // If trying to assign a different salesman, throw error
                            if (existingTerritoryAssignment.salesman_id !== salesmanId) {
                                yield queryRunner.rollbackTransaction();
                                return {
                                    status: http_status_codes_1.default.CONFLICT,
                                    message: `Territory ${territory.name} (ID: ${territoryId}) already has salesman ID ${existingTerritoryAssignment.salesman_id} assigned. Please unassign them first before assigning a new salesman.`,
                                };
                            }
                            // If same salesman, no action needed
                        }
                        else {
                            // Create new assignment
                            const territorySalesman = queryRunner.manager.create(TerritorySalesMan_entity_1.TerritorySalesman, {
                                territory_id: territoryId,
                                salesman_id: salesmanId,
                            });
                            yield queryRunner.manager.save(TerritorySalesMan_entity_1.TerritorySalesman, territorySalesman);
                        }
                    }
                }
                yield queryRunner.manager.update(Territory_entity_1.Territory, { territory_id: territoryId }, {
                    name: data.name || territory.name,
                    postal_codes: data.postal_codes
                        ? JSON.stringify(data.postal_codes)
                        : territory.postal_codes,
                    subregions: data.subregions
                        ? JSON.stringify(data.subregions)
                        : territory.subregions,
                    polygon_id: ((_a = data.polygon_id) !== null && _a !== void 0 ? _a : territory.polygon_id) !== undefined
                        ? (_b = data.polygon_id) !== null && _b !== void 0 ? _b : territory.polygon_id
                        : undefined,
                    manager_id: (_c = data.manager_id) !== null && _c !== void 0 ? _c : territory.manager_id,
                    updated_by: adminId.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                });
                const updatedTerritory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                    where: { territory_id: territoryId },
                });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: updatedTerritory,
                    message: "Territory updated successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to update territory: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    deleteTerritory(territoryId, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const territory = yield queryRunner.manager.findOne(Territory_entity_1.Territory, {
                    where: { territory_id: territoryId, is_active: true },
                });
                if (!territory) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Territory not found",
                    };
                }
                yield queryRunner.manager.update(Territory_entity_1.Territory, { territory_id: territoryId }, {
                    is_active: false,
                    updated_by: adminId.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    message: "Territory deleted successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to delete territory: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getTerritoryById(territoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const territory = yield dataSource.manager.findOne(Territory_entity_1.Territory, {
                    where: { territory_id: territoryId, is_active: true },
                    relations: ["polygon"],
                });
                if (!territory) {
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Territory not found",
                    };
                }
                return {
                    status: http_status_codes_1.default.OK,
                    data: territory,
                    message: "Territory retrieved successfully",
                };
            }
            catch (error) {
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to retrieve territory: ${error.message}`,
                };
            }
        });
    }
    getAllTerritories(_a) {
        return __awaiter(this, arguments, void 0, function* ({ org_id, skip, limit, page, salesmanId, }) {
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                // Fetch active territories for org
                const baseQuery = dataSource.manager
                    .getRepository(Territory_entity_1.Territory)
                    .createQueryBuilder("territory")
                    .leftJoinAndSelect("territory.polygon", "polygon")
                    .where("territory.is_active = true")
                    .andWhere("territory.org_id = :org_id", { org_id });
                const [territories, total] = yield baseQuery
                    .skip(skip)
                    .take(limit)
                    .getManyAndCount();
                if (!territories.length) {
                    return {
                        status: http_status_codes_1.default.OK,
                        data: [],
                        message: "No territories found",
                        total: 0,
                    };
                }
                const territoryIds = territories.map((t) => t.territory_id);
                // Get salesmen assigned to the listed territories
                const territorySalesmenQuery = dataSource
                    .getRepository(TerritorySalesMan_entity_1.TerritorySalesman)
                    .createQueryBuilder("ts")
                    .leftJoinAndSelect("ts.salesman", "salesman")
                    .where("ts.territory_id IN (:...territoryIds)", { territoryIds });
                // Apply salesman filter if given
                if (salesmanId) {
                    territorySalesmenQuery.andWhere("ts.salesman_id = :salesmanId", {
                        salesmanId,
                    });
                }
                const territorySalesmen = yield territorySalesmenQuery.getMany();
                // Group salesmen by territory
                const territoriesWithSalesmen = territories.map((territory) => {
                    const salesmen = territorySalesmen
                        .filter((ts) => ts.territory_id === territory.territory_id)
                        .map((ts) => ts.salesman);
                    return Object.assign(Object.assign({}, territory), { salesmen });
                });
                return {
                    status: http_status_codes_1.default.OK,
                    data: territoriesWithSalesmen,
                    message: "Territories retrieved successfully",
                    total,
                };
            }
            catch (error) {
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to retrieve territories: ${error.message}`,
                    data: null,
                    total: 0,
                };
            }
        });
    }
}
exports.TerritoryService = TerritoryService;
