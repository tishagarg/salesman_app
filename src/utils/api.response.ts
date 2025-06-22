import { Response } from "express";
import httpStatusCodes from "http-status-codes";

import {
  ICookie,
  IPagination,
  IOverrideRequest,
} from "../interfaces/common.interface";

import constants from "../constants";

export class ApiResponse {
  static result = (
    res: Response,
    data: object | null,
    status: number = 200,
    cookie: ICookie | null = null,
    message: string | null = null,
    pagination: IPagination | null = null
  ) => {
    res.status(status);
    if (cookie) {
      res.cookie(cookie.key, cookie.value);
    }

    let responseData: any = { success: true, data, message };

    if (pagination) {
      responseData = { ...responseData, pagination };
    }

    res.json(responseData);
  };

  static error = (
    res: Response,
    status: number = 400,
    error: string = httpStatusCodes.getStatusText(status),
    errors?: string[] | undefined | null
  ) => {
    res.status(status).json({
      success: false,
      error: {
        message: error,
      },
      errors,
    });
  };

  static setCookie = (res: Response, key: string, value: string) => {
    res.cookie(key, value);
  };

  static exception(res: any, error: any) {
    if (error instanceof Error) {
      return ApiResponse.error(res, httpStatusCodes.OK, error.message, null);
    }
    return ApiResponse.error(
      res,
      httpStatusCodes.BAD_REQUEST,
      constants.ERROR_CODE.SOMETHING_WENT_WRONG,
      null
    );
  }
}
