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
exports.AuditService = void 0;
const data_source_1 = require("../config/data-source");
const AuditLog_entity_1 = require("../models/AuditLog.entity");
class AuditService {
    logAction(userId, action, details) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.connect();
            yield queryRunner.startTransaction();
            try {
                yield queryRunner.manager.save(AuditLog_entity_1.AuditLog, {
                    user_id: userId,
                    action,
                    details,
                    created_by: userId.toString(),
                });
                yield queryRunner.commitTransaction();
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
}
exports.AuditService = AuditService;
