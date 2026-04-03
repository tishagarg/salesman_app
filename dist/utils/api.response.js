"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const constants_1 = __importDefault(require("../constants"));
class ApiResponse {
    static exception(res, error) {
        if (error instanceof Error) {
            return ApiResponse.error(res, http_status_codes_1.default.OK, error.message, null);
        }
        return ApiResponse.error(res, http_status_codes_1.default.BAD_REQUEST, constants_1.default.ERROR_CODE.SOMETHING_WENT_WRONG, null);
    }
}
exports.ApiResponse = ApiResponse;
ApiResponse.result = (res, data, status = 200, cookie = null, message = null, pagination = null) => {
    res.status(status);
    if (cookie) {
        res.cookie(cookie.key, cookie.value);
    }
    let responseData = { success: true, data, message };
    if (pagination) {
        responseData = Object.assign(Object.assign({}, responseData), { pagination });
    }
    res.json(responseData);
};
ApiResponse.error = (res, status = 400, error = http_status_codes_1.default.getStatusText(status), errors) => {
    res.status(status).json({
        success: false,
        error: {
            message: error,
        },
        errors,
    });
};
ApiResponse.setCookie = (res, key, value) => {
    res.cookie(key, value);
};
