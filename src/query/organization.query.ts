import { Organization } from "../models/Organisation.entity";
import { User } from "../models/User.entity";

import { EntityManager } from "typeorm";
import { getFinnishTime } from "../utils/timezone";

export class OrganizationQuery {
  // Method to save a new organization
  async saveOrganization(
    manager: EntityManager,
    org_name: string | null
  ): Promise<Organization> {
    if (!org_name) {
      org_name = "";
    }
    const organization = manager
      .getRepository(Organization)
      .create({ org_name });
    const dbResponse = await manager
      .getRepository(Organization)
      .save(organization);
    return dbResponse;
  }

  // Method to update an existing organization
  async updateOrganization(
    manager: EntityManager,
    org_id: number, // The organization ID to update
    updateData: Partial<Organization> // The data you want to update
  ): Promise<Organization | null> {
    const organizationRepo = manager.getRepository(Organization);

    // Update the organization record
    await organizationRepo.update(org_id, {
      ...updateData,
      updated_at: getFinnishTime(), // Ensure updated_at is set
    });

    // Fetch the updated organization
    const updatedOrganization = await organizationRepo.findOne({
      where: { org_id },
    });

    return updatedOrganization;
  }

  async getUserByIdWithOrganization(
    manager: EntityManager,
    userId: number
  ): Promise<any | null> {
    const result = await manager
      .createQueryBuilder()
      .select("*")
      .from(User, "user")
      .leftJoin(
        Organization,
        "organization",
        "user.org_id = organization.org_id"
      )
      .where("user.user_id = :userId", { userId })
      .getRawOne();

    if (!result) return null;

    return result;
  }

  async getOrganizationById(
    manager: EntityManager,
    org_id: number
  ): Promise<Organization | null> {
    const organizationRepo = manager.getRepository(Organization);

    // Fetch the organization by ID
    const organization = await organizationRepo.findOne({
      where: { org_id },
    });

    return organization;
  }

  async getOrganizationByOwnerId(
    manager: EntityManager,
    owner_id: number
  ): Promise<Organization | null> {
    const organizationRepo = manager.getRepository(Organization);

    // Fetch the organization by owner ID
    const organization = await organizationRepo.findOne({
      where: { owner_id },
    });

    return organization;
  }
}
