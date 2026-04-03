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
exports.AddressService = void 0;
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const data_source_1 = require("../config/data-source");
const Address_entity_1 = require("../models/Address.entity");
const geoCode_service_1 = require("../utils/geoCode.service");
const territory_service_1 = require("./territory.service");
const common_interface_1 = require("../interfaces/common.interface");
const Region_entity_1 = require("../models/Region.entity");
const Subregion_entity_1 = require("../models/Subregion.entity");
const Territory_entity_1 = require("../models/Territory.entity");
class AddressService {
    constructor() {
        this.geocodingService = new geoCode_service_1.GeocodingService();
        this.territoryService = new territory_service_1.TerritoryService();
    }
    getFinnishRegions() {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const regions = yield dataSource.manager.find(Region_entity_1.Region, {
                where: { is_active: true },
                select: ["name"],
            });
            return regions.map((region) => region.name);
        });
    }
    getFinnishSubregions(region) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const subregions = yield dataSource.manager.find(Subregion_entity_1.Subregion, {
                where: { region_name: region, is_active: true },
                select: ["name"],
            });
            return subregions.map((subregion) => subregion.name);
        });
    }
    createAddress(data, userId, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.connect();
            yield queryRunner.startTransaction();
            try {
                const addressData = new common_interface_1.AddressDto();
                Object.assign(addressData, data);
                const territories = yield queryRunner.manager.find(Territory_entity_1.Territory, {
                    where: { org_id, is_active: true },
                    select: ["territory_id", "regions", "subregions", "postal_codes"],
                });
                const territoryLookup = new Map();
                territories.forEach((territory) => {
                    const territoryId = territory.territory_id;
                    try {
                        if (territory.postal_codes) {
                            JSON.parse(territory.postal_codes).forEach((code) => territoryLookup.set(`postal:${code}`, territoryId));
                        }
                        if (territory.regions) {
                            JSON.parse(territory.regions).forEach((region) => territoryLookup.set(`region:${region}`, territoryId));
                        }
                        if (territory.subregions) {
                            JSON.parse(territory.subregions).forEach((subregion) => territoryLookup.set(`subregion:${subregion}`, territoryId));
                        }
                    }
                    catch (e) {
                        console.warn(`Malformed JSON in territory ${territoryId}: ${e}`);
                    }
                });
                const territoryId = territoryLookup.get(`postal:${addressData.postal_code}`) ||
                    territoryLookup.get(`region:${addressData.region}`) ||
                    territoryLookup.get(`subregion:${addressData.subregion}`) ||
                    null;
                if (!/^\d{5}$/.test(data.postal_code)) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Postal code must be 5 numeric characters",
                    };
                }
                if (data.latitude && (data.latitude < 59.5 || data.latitude > 70.1)) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Latitude must be between 59.5 and 70.1",
                    };
                }
                if (data.longitude && (data.longitude < 19.0 || data.longitude > 31.6)) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Longitude must be between 19.0 and 31.6",
                    };
                }
                const existing = yield queryRunner.manager.findOne(Address_entity_1.Address, {
                    where: {
                        postal_code: data.postal_code,
                        street_address: data.street_address,
                        subregion: data.subregion,
                        org_id: data.org_id,
                        territory_id: territoryId || undefined,
                    },
                });
                if (existing) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.CONFLICT,
                        message: "Address already exists",
                    };
                }
                let coords = { latitude: data.latitude, longitude: data.longitude };
                if (!data.latitude || !data.longitude) {
                    coords = yield this.geocodingService.getCoordinates({
                        street_address: data.street_address,
                        postal_code: data.postal_code,
                        subregion: data.subregion,
                        region: data.region,
                        city: data.city,
                        state: data.state,
                        country: data.country || "Finland",
                    });
                }
                const address = new Address_entity_1.Address();
                address.street_address = data.street_address;
                address.building_unit = (_a = data.building_unit) !== null && _a !== void 0 ? _a : "";
                address.landmark = (_b = data.landmark) !== null && _b !== void 0 ? _b : "";
                address.postal_code = data.postal_code;
                address.area_name = data.area_name;
                address.subregion = data.subregion;
                address.region = data.region;
                address.country = data.country || "Finland";
                address.latitude = coords.latitude !== undefined ? coords.latitude : 0;
                address.longitude = coords.longitude !== undefined ? coords.longitude : 0;
                address.org_id = data.org_id;
                address.created_by = String(userId);
                address.updated_by = String(userId);
                address.city = data.subregion;
                address.state = data.region;
                const savedAddress = yield queryRunner.manager.save(Address_entity_1.Address, address);
                if (!savedAddress.address_id) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                        message: "Failed to generate address_id",
                    };
                }
                const autoAssignResult = yield this.territoryService.autoAssignTerritory(savedAddress.address_id, data.org_id, queryRunner);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.CREATED,
                    data: autoAssignResult.data || savedAddress,
                    message: "Address created successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("createAddress - Error:", error.message, error.stack);
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to create address`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
}
exports.AddressService = AddressService;
