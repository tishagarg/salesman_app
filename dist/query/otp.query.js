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
exports.OtpQuery = void 0;
const OTPVerification_entity_1 = require("../models/OTPVerification.entity");
const data_source_1 = require("../config/data-source");
class OtpQuery {
    deleteOtp(id, otp_type, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = manager ? null : yield (0, data_source_1.getDataSource)();
            const repository = manager
                ? manager.getRepository(OTPVerification_entity_1.OtpVerification)
                : dataSource.getRepository(OTPVerification_entity_1.OtpVerification);
            yield repository.delete({ otp_id: id, otp_type });
        });
    }
    findById(id, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = manager ? null : yield (0, data_source_1.getDataSource)();
            const repository = manager
                ? manager.getRepository(OTPVerification_entity_1.OtpVerification)
                : dataSource.getRepository(OTPVerification_entity_1.OtpVerification);
            const dbUser = yield repository.findOneBy({ user_id: id });
            return dbUser;
        });
    }
    saveOtp(param, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = manager ? null : yield (0, data_source_1.getDataSource)();
            const repository = manager
                ? manager.getRepository(OTPVerification_entity_1.OtpVerification)
                : dataSource.getRepository(OTPVerification_entity_1.OtpVerification);
            const saved = yield repository.save(param);
            return saved;
        });
    }
    findByUserIdAndType(user_id, otp_type, manager) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = manager ? null : yield (0, data_source_1.getDataSource)();
            const repository = manager
                ? manager.getRepository(OTPVerification_entity_1.OtpVerification)
                : dataSource.getRepository(OTPVerification_entity_1.OtpVerification);
            const dbUser = yield repository.findOneBy({ user_id, otp_type });
            return dbUser;
        });
    }
}
exports.OtpQuery = OtpQuery;
