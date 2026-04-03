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
exports.MessageController = void 0;
const message_service_1 = require("../service/message.service");
const api_response_1 = require("../utils/api.response");
const messageService = new message_service_1.MessageService();
class MessageController {
    sendMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = req.body;
            const response = yield messageService.sendMessage(data);
            if (response.status >= 400) {
                return api_response_1.ApiResponse.error(res, response.status, response.message);
            }
            return api_response_1.ApiResponse.result(res, response.data, response.status, null, response.message);
        });
    }
}
exports.MessageController = MessageController;
