"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDailyVisitPlanning = runDailyVisitPlanning;
const uuid_1 = require("uuid");
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const User_entity_1 = require("../models/User.entity");
const ManagerSalesRep_entity_1 = require("../models/ManagerSalesRep.entity");
const visit_service_1 = require("./visit.service");
const timezone_1 = require("../utils/timezone");
const visitService = new visit_service_1.VisitService();
function runDailyVisitPlanning() {
    return __awaiter(this, void 0, void 0, function* () {
        const dataSource = yield (0, data_source_1.getDataSource)();
        const queryRunner = dataSource.createQueryRunner();
        yield queryRunner.startTransaction();
        try {
            const reps = yield queryRunner.manager.find(User_entity_1.User, {
                where: { is_active: true, role_id: 9 },
                select: ["user_id"],
            });
            const repIds = reps.map((rep) => rep.user_id);
            console.log(`Planning visits for reps: ${repIds.join(", ")}`);
            const managerAssignments = yield queryRunner.manager.find(ManagerSalesRep_entity_1.ManagerSalesRep, {
                where: { sales_rep_id: (0, typeorm_1.In)(repIds) },
                select: ["manager_id", "sales_rep_id"],
            });
            for (const repId of repIds) {
                // if (!managerId) {
                //   console.warn(`No manager assigned for repId: ${repId}, skipping...`);
                //   continue;
                // }
                const idempotencyKey = (0, uuid_1.v4)();
                console.log(`Planning visits for repId: ${repId},  idempotencyKey: ${idempotencyKey}`);
                const result = yield visitService.planDailyVisits(repId, (0, timezone_1.getFinnishTime)(), idempotencyKey);
            }
            yield queryRunner.commitTransaction();
        }
        catch (error) {
            yield queryRunner.rollbackTransaction();
            console.log(error);
            console.error(`Error during scheduled visit planning: ${error.message}`);
        }
        finally {
            yield queryRunner.release();
        }
    });
}
