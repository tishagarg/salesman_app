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
import { Roles } from "../enum/roles";
import { LeadStatus } from "../enum/leadStatus";

const userTeamService = new UserTeamService();
export class UserTeamController {
  async getDashboard(req: any, res: Response): Promise<void> {
    const response = await userTeamService.getDashboard();
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
  async getLeadStatus(req: any, res: Response): Promise<void> {
    const leadStatusValues = Object.values(LeadStatus);
    res.status(200).json({
      data: leadStatusValues,
      status: 200,
      message: "Lead status fetched successfully",
    });
  }
  async getAllRoles(req: any, res: Response): Promise<void> {
    const { org_id } = req.user;
    const response = await userTeamService.getAllRoles(org_id);
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
  async getSalesRepManagaerList(req: any, res: Response): Promise<void> {
    let { user_id } = req.user as IJwtVerify;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const managerId = req.query.managerId
      ? parseInt(req.query.managerId)
      : undefined;
    const salesmanId = req.query.salesmanId
      ? parseInt(req.query.salesmanId)
      : undefined;

    const response = await userTeamService.getSalesRepManagaerList(
      page,
      limit,
      search,
      managerId,
      salesmanId
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }
    const totalPages = Math.ceil(response?.total / limit);
    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message,
      {
        previousPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? page + 1 : null,
        currentPage: page,
        totalItems: response?.total,
        totalPages,
      }
    );
  }
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

  async assignManagerToSalesRep(req: any, res: Response): Promise<void> {
    let { user_id, org_id } = req.user;
    const { manager_id, sale_rep_ids } = req.body;
    const response = await userTeamService.assignManagerToSalesRep(
      { user_id, org_id } as IJwtVerify,
      manager_id,
      sale_rep_ids
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

  async addTeamMember(req: any, res: Response): Promise<void> {
    const { org_id, user_id } = req.user;
    const params: ITeamMemberBody = req.body;
    const response = await userTeamService.addTeamMember(org_id, user_id, {
      ...params,
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
    const role = req.query.role as string;
    const status = req.query.status as string;
    const response = await userTeamService.getAllTeamMember(org_id, {
      page,
      limit,
      skip,
      search,
      role,
      status,
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
    const { org_id, role_id } = req.user as IJwtVerify;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const response = await userTeamService.getUsersByRole(
      org_id,
      Roles.SALES_REP,
      {
        limit,
        skip,
        search,
      }
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message,
      response.pagination
    );
  }
  async getUnassignedSalesRep(req: any, res: Response): Promise<void> {
    const { org_id, role_id } = req.user as IJwtVerify;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const response = await userTeamService.getUnassignedSalesRep(org_id, {
      limit,
      skip,
      search,
    });
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    const totalPages = Math.ceil(response.total / limit);

    const paginationMeta = {
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      currentPage: page,
      totalItems: response.total,
      totalPages,
    };

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message,
      paginationMeta
    );
  }
  async getAllManagers(req: any, res: Response): Promise<void> {
    const { org_id } = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const response = await userTeamService.getUsersByRole(
      org_id,
      Roles.MANAGER,
      {
        limit,
        skip,
        search,
      }
    );
    if (response.status >= 400) {
      return ApiResponse.error(res, response.status, response.message);
    }

    return ApiResponse.result(
      res,
      response.data,
      response.status,
      null,
      response.message,
      response.pagination
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
