import { v4 as uuidv4 } from "uuid";
import { In } from "typeorm";
import { getDataSource } from "../config/data-source";
import { User } from "../models/User.entity";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { VisitService } from "./visit.service";
import { getFinnishTime } from "../utils/timezone";
const visitService = new VisitService();
export async function runDailyVisitPlanning() {
  const dataSource = await getDataSource();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    const reps = await queryRunner.manager.find(User, {
      where: { is_active: true, role_id: 9 },
      select: ["user_id"],
    });
    const repIds = reps.map((rep: any) => rep.user_id);
    console.log(`Planning visits for reps: ${repIds.join(", ")}`);
    const managerAssignments = await queryRunner.manager.find(ManagerSalesRep, {
      where: { sales_rep_id: In(repIds) },
      select: ["manager_id", "sales_rep_id"],
    });
    for (const repId of repIds) {
      // if (!managerId) {
      //   console.warn(`No manager assigned for repId: ${repId}, skipping...`);
      //   continue;
      // }

      const idempotencyKey = uuidv4();
      console.log(
        `Planning visits for repId: ${repId},  idempotencyKey: ${idempotencyKey}`
      );
      const result = await visitService.planDailyVisits(
        repId,
        getFinnishTime(),
        idempotencyKey
      );
    }

    await queryRunner.commitTransaction();
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    console.log(error);
    console.error(`Error during scheduled visit planning: ${error.message}`);
  } finally {
    await queryRunner.release();
  }
}
