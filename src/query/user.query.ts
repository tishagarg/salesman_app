import { EntityManager } from "typeorm";
import { getDataSource } from "../config/data-source";
import { IsaveTokenParams } from "../interfaces/user.interface";
import { UserTokenQuery } from "./usertoken.query";
import { User } from "../models/User.entity";
import { UserToken } from "../models/UserToken.entity";

const userTokenQuery = new UserTokenQuery();

export class UserQuery {
  async findUserByEmail(
    manager: EntityManager,
    email: string
  ): Promise<User | null> {
    const userRepo = manager.getRepository(User);
    return await userRepo.findOne({
      where: { email },
    });
  }

  async findByEmailAndId(
    email: string,
    id: number,
    manager?: EntityManager
  ): Promise<User | null> {
    const dataSource = manager ? null : await getDataSource();
    const repository = manager
      ? manager.getRepository(User)
      : dataSource!.getRepository(User);
    return await repository.findOne({
      where: { email, user_id: id },
    });
  }

  async findById(id: number, manager?: EntityManager): Promise<User | null> {
    const dataSource = manager ? null : await getDataSource();
    const repository = manager
      ? manager.getRepository(User)
      : dataSource!.getRepository(User);
    return await repository.findOne({
      where: { user_id: id },
    });
  }

  async addUser(
    manager: EntityManager,
    userData: Partial<User>
  ): Promise<User> {
    const userRepo = manager.getRepository(User);

    const newUser = userRepo.create({
      ...userData,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await userRepo.save(newUser);

    return newUser;
  }

  async findUserByGoogleId(
    manager: EntityManager,
    googleId: string
  ): Promise<User | null> {
    const userRepo = manager.getRepository(User);
    return await userRepo.findOne({
      where: { google_oauth_id: googleId },
    });
  }

  async saveToken(
    manager: EntityManager,
    params: IsaveTokenParams
  ): Promise<UserToken> {
    let userToken: UserToken;
    userToken = new UserToken();
    userToken.user_token_id = params.id;
    userToken.user_id = params.userId;
    userToken.ttl = params.ttl;
    userToken.scopes = params.scopes;
    userToken.status = params.status;
    userToken.is_active = true;

    const savedToken = await manager.save(userToken);
    return savedToken;
  }

  async findByEmail(
    email: string,
    manager?: EntityManager
  ): Promise<User | null> {
    const dataSource = manager ? null : await getDataSource();
    const repository = manager
      ? manager.getRepository(User)
      : dataSource!.getRepository(User);
    return await repository.findOne({
      where: { email },
    });
  }

  async createUser(
    manager: EntityManager,
    userData: Partial<User>
  ): Promise<User> {
    const userRepo = manager.getRepository(User);
    const newUser = userRepo.create({
      ...userData,
    });

    await userRepo.save(newUser);
    return newUser;
  }

  async findByIdAndUpdate(
    manager: EntityManager,
    user_id: number,
    updateData: Partial<User>
  ): Promise<User | null> {
    const userRepo = manager.getRepository(User);

    await userRepo.update(user_id, {
      ...updateData,
      updated_at: new Date(),
    });

    const updatedUser = await userRepo.findOne({
      where: { user_id },
    });

    return updatedUser;
  }

  async getAllUsersWithRoleName(
    manager: EntityManager,
    org_id: number,
    role_name: string,
    limit: number,
    skip: number,
    search: string
  ): Promise<[any[], number]> {
    let query = manager
      .createQueryBuilder(User, "user")
      .innerJoin("user.role", "role")
      .select([
        "user.user_id",
        "user.email",
        "user.phone",
        "user.google_oauth_id",
        "user.is_email_verified",
        "user.full_name",
        "user.org_id",
        "user.role_id",
        "user.is_admin",
        "user.is_active",
        "user.created_by",
        "user.updated_by",
        "user.created_at",
        "user.is_super_admin",
        "user.updated_at",
        "role.role_name",
      ])
      .where("user.org_id = :org_id", { org_id })
      .andWhere("user.is_active = :is_active", { is_active: true })
      .andWhere("role.role_name = :role_name", { role_name });

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      query = query.andWhere(
        `(LOWER(COALESCE(user.email, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.full_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.first_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.last_name, '')) LIKE :searchTerm)`,
        { searchTerm }
      );
    }
    const [users, total] = await query
      .orderBy("user.user_id", "ASC")
      .take(limit)
      .skip(skip)
      .getManyAndCount();
    return [users, total];
  }

  async getAllUsersWithRoles(
    manager: EntityManager,
    org_id: number,
    limit: number,
    skip: number,
    search: string,
    role?: string,
    status?: string
  ): Promise<[any[], number]> {
    let query = await manager
      .createQueryBuilder(User, "user")
      .leftJoin("user.role", "role")
      .select([
        "user.user_id",
        "user.email",
        "user.phone",
        "user.google_oauth_id",
        "user.is_email_verified",
        "user.full_name",
        "user.org_id",
        "user.role_id",
        "user.is_admin",
        "user.is_active",
        "user.created_by",
        "user.updated_by",
        "user.created_at",
        "user.is_super_admin",
        "user.updated_at",
        "role.role_name",
      ])
      .where("user.org_id = :org_id", { org_id });

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      query = query.andWhere(
        `(LOWER(COALESCE(user.email, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.full_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.first_name, '')) LIKE :searchTerm
         OR LOWER(COALESCE(user.last_name, '')) LIKE :searchTerm)`,
        { searchTerm }
      );
    }
    if (role && role.trim() !== "") {
      query = query.andWhere("LOWER(role.role_name) = :role", {
        role: role.toLowerCase(),
      });
      console.log(query)
    }
    if (status && (status === "active" || status === "inactive")) {
      const isActive = status === "active";
      query = query.andWhere("user.is_active = :isActive", { isActive });
    }

    const [users, total] = await query
      .orderBy("user.user_id", "ASC")
      .take(limit)
      .skip(skip)
      .getManyAndCount();
    return [users, total];
  }

  async getUserById(
    manager: EntityManager,
    org_id: number,
    user_id: number
  ): Promise<User | null> {
    return await manager.getRepository(User).findOne({
      where: { is_active: true, user_id, org_id },
      relations: { role: true },
    });
  }

  async getUserByIdAllStatus(
    manager: EntityManager,
    org_id: number,
    id: number
  ): Promise<User | null> {
    return await manager
      .getRepository(User)
      .findOne({ where: { user_id: id, org_id } });
  }

  async updateUser(
    manager: EntityManager,
    org_id: number,
    user_id: number,
    updateData: Partial<User>
  ): Promise<User | null> {
    const userRepo = manager.getRepository(User);

    await userRepo.update(
      { user_id, org_id },
      {
        ...updateData,
        updated_at: new Date(),
        updated_by: String(user_id).trim(),
      }
    );

    const updatedUser = await userRepo.findOne({
      where: { user_id, org_id },
    });

    return updatedUser;
  }

  async activeDeactiveUser(
    manager: EntityManager,
    org_id: number,
    id: number,
    status: boolean,
    user_id: number
  ): Promise<void> {
    const userRepo = manager.getRepository(User);

    await userRepo.update(
      { user_id: id, org_id },
      {
        is_active: status,
        updated_at: new Date(),
        updated_by: String(user_id).trim(),
      }
    );
  }
}
