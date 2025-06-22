// services/contractTemplate.service.ts

import { In } from "typeorm";
import { getDataSource } from "../config/data-source";
import { User } from "../models/User.entity";
import { ContractTemplate } from "../models/ContractTemplate.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { Contract } from "../models/Contracts.entity";

export const ContractTemplateService = {
  async createContractTemplate(payload: {
    title: string;
    content: string;
    status: string;
    assigned_manager_ids: number[];
  }): Promise<{ status: number; data?: any; message: string }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const contractRepo = queryRunner.manager.getRepository(ContractTemplate);

      const managers = await userRepo.find({
        where: { user_id: In(payload.assigned_manager_ids) },
      });

      const newTemplate = contractRepo.create({
        title: payload.title,
        content: payload.content,
        status: payload.status,
        assigned_managers: managers,
      });

      const savedTemplate = await contractRepo.save(newTemplate);
      await queryRunner.commitTransaction();

      return {
        status: 201,
        data: savedTemplate,
        message: "Contract template created successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        status: 500,
        message: "Failed to create contract template",
      };
    } finally {
      await queryRunner.release();
    }
  },

  async getAllContracts(filters: {
    managerId?: number;
    status?: string;
    search?: string;
    sortBy?: "signedCount" | "title" | "date";
    skip?: number;
    limit?: number;
    page?: number;
  }): Promise<{
    data: Contract[] | null;
    status: number;
    message: string;
    total: number;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const contractRepo = queryRunner.manager.getRepository(Contract);

      let query = contractRepo
        .createQueryBuilder("contract")
        .leftJoinAndSelect("contract.template", "template")
        .leftJoinAndSelect("contract.visit", "visit")
        .leftJoinAndSelect("visit.rep", "rep")
        .leftJoinAndSelect("visit.lead", "lead");

      if (filters.managerId) {
        query = query
          .leftJoin("template.assigned_managers", "manager")
          .andWhere("manager.user_id = :managerId", {
            managerId: filters.managerId,
          });
      }

      if (filters.status) {
        query = query.andWhere("template.status = :status", {
          status: filters.status,
        });
      }

      if (filters.search) {
        query = query.andWhere("LOWER(template.title) ILIKE :search", {
          search: `%${filters.search.toLowerCase()}%`,
        });
      }

      if (filters.sortBy === "signedCount") {
        query = query.orderBy("template.total_signed", "DESC");
      } else if (filters.sortBy === "title") {
        query = query.orderBy("template.title", "ASC");
      } else {
        query = query.orderBy("contract.signed_at", "DESC");
      }
      const [contracts, total] = await query
        .skip(filters.skip || 0)
        .take(filters.limit || 10)
        .getManyAndCount();

      await queryRunner.commitTransaction();

      return {
        data: contracts,
        status: 200,
        message: "Contracts fetched successfully",
        total,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        data: null,
        status: 500,
        message: "Error fetching contracts",
        total: 0,
      };
    } finally {
      await queryRunner.release();
    }
  },
  async listContractTemplates(): Promise<{
    data: ContractTemplate[] | null;
    status: number;
    message: string;
  }> {
    const dataSource = await getDataSource();
    const queryRunner = await dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const contractRepo = dataSource.getRepository(ContractTemplate);
      const contracts = await contractRepo.find({
        relations: { assigned_managers: true },
        order: { updated_at: "DESC" },
      });
      await queryRunner.commitTransaction();
      return {
        data: contracts,
        status: 200,
        message: "Contracts fetched successfully",
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        data: null,
        status: 500,
        message: "Error fetching contracts",
      };
    } finally {
      await queryRunner.release();
    }
  },

  async getTemplatesForSalesRep(
    repId: number
  ): Promise<{ data: any; status: number; message: string }> {
    const dataSource = await getDataSource();
    const queryRunner = await dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const dataSource = await getDataSource();
      const templateRepo = dataSource.getRepository(ContractTemplate);
      const managerMappings = await dataSource
        .getRepository(ManagerSalesRep)
        .find({
          where: { sales_rep: { user_id: repId } },
          relations: { manager: true },
        });
      const managerIds = managerMappings.map((m) => m.manager.user_id);
      if (managerIds.length === 0) {
        await queryRunner.rollbackTransaction();
        return { data: [], status: 404, message: "No managers found" };
      }
      const templates = await templateRepo
        .createQueryBuilder("template")
        .leftJoin("template.assigned_managers", "manager")
        .where("manager.user_id IN (:...managerIds)", { managerIds })
        .getMany();
      await queryRunner.commitTransaction();

      return {
        data: templates,
        message: "Templates fetched successfully",
        status: 200,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        data: null,
        message: "Error fetching templates",
        status: 500,
      };
    } finally {
      await queryRunner.release();
    }
  },
};
