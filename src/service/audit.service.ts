import { getDataSource } from "../config/data-source";
import { AuditLog } from "../models/AuditLog.entity";

export class AuditService {
  async logAction(userId: number, action: string, details: string) {
    const dataSource = await getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.save(AuditLog, {
        user_id: userId,
        action,
        details,
        created_by: userId.toString(),
      });
      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }
}
