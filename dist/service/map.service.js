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
exports.MapService = void 0;
const data_source_1 = require("../config/data-source"); // Updated import
const Leads_entity_1 = require("../models/Leads.entity");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
class MapService {
    getCustomerMap(repId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const customers = yield dataSource.manager.find(Leads_entity_1.Leads, {
                    where: { assigned_rep_id: repId, is_active: true },
                    relations: ["address"],
                });
                const mapData = customers.map((c) => ({
                    lead_id: c.lead_id,
                    name: c.name,
                    status: c.status,
                    latitude: c.address.latitude,
                    longitude: c.address.longitude,
                }));
                return {
                    status: http_status_codes_1.default.OK,
                    data: mapData,
                    message: "Customer map retrieved successfully",
                };
            }
            catch (error) {
                return {
                    status: http_status_codes_1.default.BAD_REQUEST,
                    message: error.message,
                    data: null,
                };
            }
        });
    }
}
exports.MapService = MapService;
