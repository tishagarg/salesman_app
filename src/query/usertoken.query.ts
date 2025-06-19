import { UserToken } from "../models/UserToken.entity";
import { EntityManager } from "typeorm";
import { RefreshToken } from "../models/RefreshToken.entity";
import { getDataSource } from "../config/data-source";

export class UserTokenQuery {
  async deleteTokenFromDatabase(input: number | string): Promise<void> {
    const dataSource = await getDataSource();
    const userTokenRepository = dataSource.getRepository(UserToken);

    let tokenRecords;
    if (typeof input === "number") {
      tokenRecords = await userTokenRepository.find({
        where: { user_id: input },
      });
    } else {
      tokenRecords = await userTokenRepository.find({
        where: { user_token_id: input },
      });
    }

    if (!tokenRecords || tokenRecords.length === 0) {
      return;
    }
    await userTokenRepository.remove(tokenRecords);
  }

  async deleteUserTokens(manager: EntityManager, id: number): Promise<void> {
    await manager.delete(UserToken, { user_id: id });
  }

  async findTokenById(manager: EntityManager, user_id: number): Promise<UserToken[]> {
    return await manager.getRepository(UserToken).find({ where: { user_id } });
  }

  async deleteRefreshTokens(manager: EntityManager, id: number): Promise<void> {
    await manager.delete(RefreshToken, { user_id: id });
  }
}
