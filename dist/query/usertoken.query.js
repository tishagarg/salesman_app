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
exports.UserTokenQuery = void 0;
const UserToken_entity_1 = require("../models/UserToken.entity");
const RefreshToken_entity_1 = require("../models/RefreshToken.entity");
const data_source_1 = require("../config/data-source");
class UserTokenQuery {
    deleteTokenFromDatabase(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const userTokenRepository = dataSource.getRepository(UserToken_entity_1.UserToken);
            let tokenRecords;
            if (typeof input === "number") {
                tokenRecords = yield userTokenRepository.find({
                    where: { user_id: input },
                });
            }
            else {
                tokenRecords = yield userTokenRepository.find({
                    where: { user_token_id: input },
                });
            }
            if (!tokenRecords || tokenRecords.length === 0) {
                return;
            }
            yield userTokenRepository.remove(tokenRecords);
        });
    }
    deleteUserTokens(manager, id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield manager.delete(UserToken_entity_1.UserToken, { user_id: id });
        });
    }
    findTokenById(manager, user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager.getRepository(UserToken_entity_1.UserToken).find({ where: { user_id } });
        });
    }
    findRefreshTokenById(manager, user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield manager
                .getRepository(RefreshToken_entity_1.RefreshToken)
                .find({ where: { user_id } });
        });
    }
    deleteRefreshTokens(manager, id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield manager.delete(RefreshToken_entity_1.RefreshToken, { user_id: id });
        });
    }
}
exports.UserTokenQuery = UserTokenQuery;
