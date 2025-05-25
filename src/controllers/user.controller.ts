import { ApiResponse } from "../utils/api.response";
import { UserTeamService } from "../service/user.service";
import {
  activeDeactiveI,
  IJwtVerify,
  ITeamMember,
  ITeamMemberBody,
  IUserProfile,
} from "../interfaces/user.interface";
import { Response } from "express";

const userTeamService = new UserTeamService();
export class UserTeamController {
  async getUserById(req: any, res: Response): Promise<void> {
    let { user_id } = req.user as IJwtVerify;
    const response = await userTeamService.getUserById(user_id);
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

  async addTeamMember(req: any, res: Response): Promise<void> {
    const { org_id, user_id } = req.user;
    const params: ITeamMemberBody = req.body;
    const response = await userTeamService.addTeamMember(org_id, user_id, {
      ...params,
      full_name: params.first_name + " " + params.last_name,
    });
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
  async getAllTeamMember(req: any, res: Response): Promise<void> {
    const { org_id } = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const response = await userTeamService.getAllTeamMember(org_id, {
      page,
      limit,
      skip,
      search,
    });
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      {
        teamMembers: response.data,
        pagination: {
          page,
          limit,
          total: response.total ?? 0,
          totalPages: Math.ceil((response.total ?? 0) / limit),
        },
      },

      response.status,
      null,
      response.message
    );
  }
  async getTeamMemberById(req: any, res: Response): Promise<void> {
    const { org_id } = req.user;
    const user_id = req.params.id;
    const response = await userTeamService.getTeamMemberById(org_id, user_id);
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
  async editTeamMember(req: any, res: Response): Promise<void> {
    const { org_id } = req.user;
    const user_id = req.params.id;
    const updateData: Partial<ITeamMember> = req.body;

    const response = await userTeamService.editTeamMember(
      org_id,
      user_id,
      updateData
    );
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

  async activeDeactive(req: any, res: Response): Promise<void> {
    const { org_id, user_id } = req.user as IJwtVerify;
    const { status, id }: activeDeactiveI = req.body;

    const response = await userTeamService.activeDeactive(org_id, user_id, {
      status,
      id,
    });
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

  async getSalesRep(req: any, res: Response): Promise<void> {
    const { org_id } = req.user as IJwtVerify;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const response = await userTeamService.getSalesRepresentative(org_id, {
      limit,
      skip,
      search,
    });
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

  async updateProfile(req: any, res: Response): Promise<void> {
    const { org_id, user_id } = req.user;

    const updateData: Partial<IUserProfile> = req.body;
    const response = await userTeamService.updateProfile(
      org_id,
      user_id,
      updateData
    );
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
