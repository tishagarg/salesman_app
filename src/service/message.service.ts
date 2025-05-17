import dataSource from "../config/data-source";
import { User } from "../models";
import httpStatusCodes from "http-status-codes";
import { Message } from "../models/Message.entity";

export class MessageService {
  async sendMessage(data: {
    sender_id: number;
    receiver_id: number;
    content: string;
  }): Promise<{ status: number; message: string; data: any }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const sender = await queryRunner.manager.findOne(User, {
        where: { user_id: data.sender_id },
      });
      const receiver = await queryRunner.manager.findOne(User, {
        where: { user_id: data.receiver_id },
      });
      if (!sender || !receiver) {
        throw new Error("Invalid sender or receiver");
      }
      if (
        sender.role.role_name === "sales rep" &&
        receiver.role.role_name !== "manager"
      ) {
        throw new Error("Reps can only message managers");
      }
      const message = await queryRunner.manager.save(Message, {
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        content: data.content,
        status: "Sent",
        created_by: data.sender_id.toString(),
      });
      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: message,
        message: "Message sent successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
        data:null
      };
    } finally {
      await queryRunner.release();
    }
  }
}
