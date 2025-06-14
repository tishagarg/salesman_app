
import { v4 as uuidv4 } from "uuid";
import { In } from "typeorm";
import { getDataSource } from "../config/data-source";
import { User } from "../models";
import { ManagerSalesRep } from "../models/ManagerSalesRep.entity";
import { VisitService } from "./visit.service";
const visitService = new VisitService();
export async function runDailyVisitPlanning() {
  const dataSource = await getDataSource();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // Fetch all active sales reps
    const reps = await queryRunner.manager.find(User, {
      where: { is_active: true, role_id: 9 },
      select: ["user_id"],
    });
    const repIds = reps.map((rep:any) => rep.user_id);
    console.log(`Planning visits for reps: ${repIds.join(", ")}`);

    // Fetch manager assignments for all repIds
    const managerAssignments = await queryRunner.manager.find(ManagerSalesRep, {
      where: { sales_rep_id: In(repIds) },
      select: ["manager_id", "sales_rep_id"],
    });

    // Create a map of repId to managerId for quick lookup
    const repToManagerMap = new Map<number, number>();
    managerAssignments.forEach((assignment) => {
      repToManagerMap.set(assignment.sales_rep_id, assignment.manager_id);
    });

    for (const repId of repIds) {
      const managerId = repToManagerMap.get(repId);
      if (!managerId) {
        console.warn(`No manager assigned for repId: ${repId}, skipping...`);
        continue;
      }

      const idempotencyKey = uuidv4();
      // console.log(
      //   `Planning visits for repId: ${repId}, managerId: ${managerId}, idempotencyKey: ${idempotencyKey}`
      // );
      const result = await visitService.planDailyVisits(
        repId,
        managerId,
        new Date(),
        idempotencyKey
      );
    }

    await queryRunner.commitTransaction();
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    console.error(`Error during scheduled visit planning: ${error.message}`);
  } finally {
    await queryRunner.release();
  }
}