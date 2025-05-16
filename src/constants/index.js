"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_1 = __importDefault(require("./cookie"));
const errors_1 = __importDefault(require("./errors"));
const infoMessages_1 = __importDefault(require("./infoMessages"));
const regex_1 = __importDefault(require("./regex"));
exports.default = {
    COOKIE: cookie_1.default,
    ERROR_CODE: errors_1.default,
    VALID_MSG: infoMessages_1.default,
    REGEX: regex_1.default,
};
