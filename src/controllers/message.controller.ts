import { Response } from "express";
import { MessageService } from "../service/message.service";
import { ApiResponse } from "../utils/api.response";
const messageService = new MessageService();
export class MessageController {
  async sendMessage(req: any, res: Response): Promise<void> {
    const data = req.body;
    const response = await messageService.sendMessage(data);
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message
    );
  }
}
