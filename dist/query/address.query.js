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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressQuery = void 0;
const Address_entity_1 = require("../models/Address.entity");
const timezone_1 = require("../utils/timezone");
class AddressQuery {
    updateAddress(manager, address_id, addressData, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const addressRepo = manager.getRepository(Address_entity_1.Address);
            const existingAddress = yield addressRepo.findOne({
                where: { address_id, org_id },
            });
            if (!existingAddress) {
                return null;
            }
            yield addressRepo.update(address_id, Object.assign(Object.assign({}, addressData), { updated_at: (0, timezone_1.getFinnishTime)() }));
            const updatedAddress = yield addressRepo.findOne({
                where: { address_id },
            });
            return updatedAddress;
        });
    }
    getAddressById(manager, address_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const addressRepo = manager.getRepository(Address_entity_1.Address);
            const address = yield addressRepo.findOne({
                where: { address_id },
            });
            return address;
        });
    }
    createAddress(manager, addressData, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const addressRepo = manager.getRepository(Address_entity_1.Address);
            const newAddress = addressRepo.create(Object.assign(Object.assign({}, addressData), { org_id, created_at: (0, timezone_1.getFinnishTime)(), updated_at: (0, timezone_1.getFinnishTime)() }));
            return yield addressRepo.save(newAddress);
        });
    }
}
exports.AddressQuery = AddressQuery;
