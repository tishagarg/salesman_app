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
exports.AddressController = void 0;
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const address_service_1 = require("../service/address.service");
class AddressController {
    constructor() {
        this.addressService = new address_service_1.AddressService();
    }
    createAddress(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const data = req.body;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.user_id;
            if (!userId) {
                return res.status(http_status_codes_1.default.UNAUTHORIZED).json({ message: "User not authenticated" });
            }
            const result = yield this.addressService.createAddress(data, userId, req.user.org_id);
            res.status(result.status).json(result);
        });
    }
}
exports.AddressController = AddressController;
