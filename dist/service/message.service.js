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
exports.MessageService = void 0;
const data_source_1 = require("../config/data-source"); // Updated import
const User_entity_1 = require("../models/User.entity");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const Message_entity_1 = require("../models/Message.entity");
const roles_1 = require("../enum/roles");
class MessageService {
    sendMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const sender = yield queryRunner.manager.findOne(User_entity_1.User, {
                    where: { user_id: data.sender_id },
                    relations: ["role"], // Ensure role relation is loaded
                });
                const receiver = yield queryRunner.manager.findOne(User_entity_1.User, {
                    where: { user_id: data.receiver_id },
                    relations: ["role"], // Ensure role relation is loaded
                });
                if (!sender || !receiver) {
                    throw new Error("Invalid sender or receiver");
                }
                if (sender.role.role_name === roles_1.Roles.SALES_REP &&
                    receiver.role.role_name !== roles_1.Roles.MANAGER) {
                    throw new Error("Reps can only message managers");
                }
                const message = yield queryRunner.manager.save(Message_entity_1.Message, {
                    sender_id: data.sender_id,
                    receiver_id: data.receiver_id,
                    content: data.content,
                    status: "Sent",
                    created_by: data.sender_id.toString(),
                });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: message,
                    message: "Message sent successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to send message: ${error.message}`,
                    data: null,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
}
exports.MessageService = MessageService;
