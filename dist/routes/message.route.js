"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permission_middleware_1 = require("../middleware/permission.middleware");
const message_controller_1 = require("../controllers/message.controller");
const router = (0, express_1.Router)();
const messageController = new message_controller_1.MessageController();
router.post("/", (0, permission_middleware_1.permissionMiddleware)(""), messageController.sendMessage);
exports.default = router;
