import { Request, Response } from "express";
import httpStatusCodes from "http-status-codes";
import { AddressService } from "../service/address.service";
import { AddressDto } from "../interfaces/common.interface";

export class AddressController {
  private addressService = new AddressService();

  async createAddress(req: any, res: Response) {
    const data: AddressDto = req.body;
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(httpStatusCodes.UNAUTHORIZED).json({ message: "User not authenticated" });
    }

    const result = await this.addressService.createAddress(data, userId,req.user.org_id);
    res.status(result.status).json(result);
  }
}