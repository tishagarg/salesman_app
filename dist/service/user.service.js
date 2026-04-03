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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTeamService = void 0;
const user_query_1 = require("../query/user.query");
const data_source_1 = require("../config/data-source");
const bcrypt_1 = __importDefault(require("bcrypt"));
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const SALT_ROUNDS = 10;
const passwordGenerator_1 = require("../config/passwordGenerator");
const role_query_1 = require("../query/role.query");
const usertoken_query_1 = require("../query/usertoken.query");
const email_service_1 = require("./email.service");
const organization_query_1 = require("../query/organization.query");
const roles_1 = require("../enum/roles");
const Address_entity_1 = require("../models/Address.entity");
const address_query_1 = require("../query/address.query");
const territory_service_1 = require("./territory.service");
const Territory_entity_1 = require("../models/Territory.entity");
const typeorm_1 = require("typeorm");
const ManagerSalesRep_entity_1 = require("../models/ManagerSalesRep.entity");
const geoCode_service_1 = require("../utils/geoCode.service");
const User_entity_1 = require("../models/User.entity");
const Role_entity_1 = require("../models/Role.entity");
const Leads_entity_1 = require("../models/Leads.entity");
const Visits_entity_1 = require("../models/Visits.entity");
const Route_entity_1 = require("../models/Route.entity");
const Contracts_entity_1 = require("../models/Contracts.entity");
const ContractTemplate_entity_1 = require("../models/ContractTemplate.entity");
const leadStatus_1 = require("../enum/leadStatus");
const userQuery = new user_query_1.UserQuery();
const roleQuery = new role_query_1.RoleQuery();
const userTokenQuery = new usertoken_query_1.UserTokenQuery();
const organizationQuery = new organization_query_1.OrganizationQuery();
const addressQuery = new address_query_1.AddressQuery();
const territoryService = new territory_service_1.TerritoryService();
const geocodingService = new geoCode_service_1.GeocodingService();
class UserTeamService {
    SendEmailNotification(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, email_service_1.sendEmail)({
                to: email,
                subject: "Login Credentials",
                body: `Your password is ${password} and email is ${email}. Please reset your password after login.`,
            });
        });
    }
    getAllRoles(org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = yield dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const roleData = yield queryRunner.manager.getRepository(Role_entity_1.Role).find({
                    where: [{ org_id: org_id }, { role_name: roles_1.Roles.ADMIN }],
                });
                if (!roleData) {
                    return {
                        data: null,
                        status: 404,
                        message: "Roles not found",
                    };
                }
                return {
                    data: roleData,
                    status: 200,
                    message: "Roles fetched successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    data: null,
                    status: 500,
                    message: "Error fetcing roles",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getDashboard() {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = yield dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const leadsCount = yield queryRunner.manager.getRepository(Leads_entity_1.Leads).count();
                const closedVisitsCount = yield queryRunner.manager
                    .getRepository(Visits_entity_1.Visit)
                    .countBy({ check_out_time: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()) });
                const pendingVisitsCount = yield queryRunner.manager
                    .getRepository(Visits_entity_1.Visit)
                    .countBy({ check_out_time: (0, typeorm_1.IsNull)() });
                const assignedSalesRepsCount = yield queryRunner.manager
                    .getRepository(ManagerSalesRep_entity_1.ManagerSalesRep)
                    .count();
                const totalSignedContracts = yield queryRunner.manager
                    .getRepository(Contracts_entity_1.Contract)
                    .count();
                const totalContractTemplates = yield queryRunner.manager
                    .getRepository(ContractTemplate_entity_1.ContractTemplate)
                    .count();
                const salesRepCount = yield queryRunner.manager
                    .getRepository(User_entity_1.User)
                    .countBy({ role: { role_name: roles_1.Roles.SALES_REP } });
                const unassignedSalesRepsCount = salesRepCount - assignedSalesRepsCount;
                const managerCount = yield queryRunner.manager
                    .getRepository(User_entity_1.User)
                    .countBy({ role: { role_name: roles_1.Roles.MANAGER } });
                const liveRoutesCount = yield queryRunner.manager
                    .getRepository(Route_entity_1.Route)
                    .countBy({ is_active: true });
                const totalTerritoryCount = yield queryRunner.manager
                    .getRepository(Territory_entity_1.Territory)
                    .count();
                const totalAddressCount = yield queryRunner.manager
                    .getRepository(Address_entity_1.Address)
                    .count();
                const totalUsersCount = yield queryRunner.manager
                    .getRepository(User_entity_1.User)
                    .count();
                const activeUsersCount = yield queryRunner.manager
                    .getRepository(User_entity_1.User)
                    .countBy({ is_active: true });
                const assignedManagerCount = yield queryRunner.query(`
  SELECT COUNT(DISTINCT manager_id) as count 
  FROM contract_template_managers
`);
                return {
                    data: {
                        totalUsersCount,
                        activeUsersCount,
                        pendingVisitsCount,
                        managerCount,
                        salesRepCount,
                        closedVisitsCount,
                        leadsCount,
                        totalTerritoryCount,
                        totalAddressCount,
                        liveRoutesCount,
                        unassignedSalesRepsCount,
                        totalSignedContracts,
                        totalContractTemplates,
                        assignedManagerCount: assignedManagerCount.count,
                    },
                    status: 200,
                    message: "Analytics fetched successfully",
                };
            }
            catch (error) {
                console.log(error);
                yield queryRunner.rollbackTransaction();
                return {
                    data: null,
                    status: 500,
                    message: "Error fetcing dashboard results",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    assignManagerToSalesRep(userData, manager_id, sales_rep_ids) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const manager = yield userQuery.getUserById(queryRunner.manager, userData.org_id, manager_id);
                if (!manager) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 404, message: "Manager not found", data: null };
                }
                if (((_a = manager === null || manager === void 0 ? void 0 : manager.role) === null || _a === void 0 ? void 0 : _a.role_name) !== roles_1.Roles.MANAGER) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 404, message: "User is not a manager", data: null };
                }
                if (!Array.isArray(sales_rep_ids) || sales_rep_ids.length === 0) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 400,
                        message: "Sales rep IDs must be a non-empty array.",
                        data: null,
                    };
                }
                yield queryRunner.manager
                    .createQueryBuilder()
                    .delete()
                    .from("manager_sales_rep")
                    .where("sales_rep_id IN (:...ids)", { ids: sales_rep_ids })
                    .execute();
                const assignments = sales_rep_ids.map((rep_id) => queryRunner.manager.create(ManagerSalesRep_entity_1.ManagerSalesRep, {
                    manager_id,
                    sales_rep_id: rep_id,
                }));
                yield queryRunner.manager.save(ManagerSalesRep_entity_1.ManagerSalesRep, assignments);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    message: "Manager assigned to sales reps successfully",
                    data: assignments,
                };
            }
            catch (error) {
                console.error(error);
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: "An error occurred while assigning manager to sales reps.",
                    data: null,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    removeManagerFromSalesRep(userData, sales_rep_id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const salesRep = yield userQuery.getUserById(queryRunner.manager, userData.org_id, sales_rep_id);
                if (!salesRep) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 404, message: "Sales representative not found", data: null };
                }
                if (((_a = salesRep === null || salesRep === void 0 ? void 0 : salesRep.role) === null || _a === void 0 ? void 0 : _a.role_name) !== roles_1.Roles.SALES_REP) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 400, message: "User is not a sales representative", data: null };
                }
                const existingAssignment = yield queryRunner.manager
                    .createQueryBuilder()
                    .select("msr")
                    .from(ManagerSalesRep_entity_1.ManagerSalesRep, "msr")
                    .where("msr.sales_rep_id = :sales_rep_id", { sales_rep_id })
                    .getOne();
                if (!existingAssignment) {
                    yield queryRunner.rollbackTransaction();
                    return { status: 404, message: "No manager assignment found for this sales representative", data: null };
                }
                yield queryRunner.manager
                    .createQueryBuilder()
                    .delete()
                    .from(ManagerSalesRep_entity_1.ManagerSalesRep)
                    .where("sales_rep_id = :sales_rep_id", { sales_rep_id })
                    .execute();
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    message: "Manager assignment removed successfully",
                    data: null,
                };
            }
            catch (error) {
                console.error(error);
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: "An error occurred while removing manager assignment.",
                    data: null,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getManagerDashboard(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                // Get sales reps under this manager
                const salesRepsUnderManager = yield queryRunner.manager
                    .createQueryBuilder()
                    .select("msr.sales_rep_id", "sales_rep_id")
                    .from(ManagerSalesRep_entity_1.ManagerSalesRep, "msr")
                    .where("msr.manager_id = :manager_id", { manager_id: userData.user_id })
                    .getRawMany();
                const salesRepIds = salesRepsUnderManager.map(rep => rep.sales_rep_id);
                const salesRepsCount = salesRepIds.length;
                if (salesRepsCount === 0) {
                    yield queryRunner.commitTransaction();
                    return {
                        data: {
                            salesRepsCount: 0,
                            totalLeads: 0,
                            visitedLeads: 0,
                            unVisitedLeads: 0,
                            signedLeads: 0,
                            unSignedLeads: 0,
                            pendingVisits: 0,
                            completedVisits: 0,
                            totalContracts: 0,
                            salesRepDetails: [],
                        },
                        status: 200,
                        message: "Manager dashboard data fetched successfully",
                    };
                }
                // Run parallel queries for manager's team data
                const [totalLeads, visitedLeads, unVisitedLeads, signedLeads, unSignedLeads, pendingVisits, completedVisits, totalContracts, salesRepDetails,] = yield Promise.all([
                    // Total leads assigned to manager's sales reps
                    queryRunner.manager.getRepository(Leads_entity_1.Leads).count({
                        where: { assigned_rep_id: (0, typeorm_1.In)(salesRepIds) },
                    }),
                    // Visited leads (not Prospect or Start_Signing)
                    queryRunner.manager.getRepository(Leads_entity_1.Leads).count({
                        where: {
                            assigned_rep_id: (0, typeorm_1.In)(salesRepIds),
                            status: (0, typeorm_1.Not)((0, typeorm_1.In)([leadStatus_1.LeadStatus.Prospect, leadStatus_1.LeadStatus.Start_Signing])),
                        },
                    }),
                    // Unvisited leads (Prospect or Start_Signing)
                    queryRunner.manager.getRepository(Leads_entity_1.Leads).count({
                        where: {
                            assigned_rep_id: (0, typeorm_1.In)(salesRepIds),
                            status: (0, typeorm_1.In)([leadStatus_1.LeadStatus.Prospect, leadStatus_1.LeadStatus.Start_Signing]),
                        },
                    }),
                    // Signed leads
                    queryRunner.manager.getRepository(Leads_entity_1.Leads).count({
                        where: {
                            assigned_rep_id: (0, typeorm_1.In)(salesRepIds),
                            status: leadStatus_1.LeadStatus.Signed,
                        },
                    }),
                    // Unsigned leads
                    queryRunner.manager.getRepository(Leads_entity_1.Leads).count({
                        where: {
                            assigned_rep_id: (0, typeorm_1.In)(salesRepIds),
                            status: (0, typeorm_1.Not)((0, typeorm_1.In)([leadStatus_1.LeadStatus.Signed])),
                        },
                    }),
                    // Pending visits (not checked out)
                    queryRunner.manager.getRepository(Visits_entity_1.Visit).count({
                        where: {
                            rep_id: (0, typeorm_1.In)(salesRepIds),
                            check_out_time: (0, typeorm_1.IsNull)(),
                        },
                    }),
                    // Completed visits (checked out)
                    queryRunner.manager.getRepository(Visits_entity_1.Visit).count({
                        where: {
                            rep_id: (0, typeorm_1.In)(salesRepIds),
                            check_out_time: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()),
                        },
                    }),
                    // Total contracts signed by manager's sales reps - join through visit
                    queryRunner.manager
                        .createQueryBuilder(Contracts_entity_1.Contract, "c")
                        .innerJoin(Visits_entity_1.Visit, "v", "v.visit_id = c.visit_id")
                        .where("v.rep_id IN (:...salesRepIds)", { salesRepIds })
                        .getCount(),
                    // Sales rep details with their performance
                    queryRunner.manager
                        .createQueryBuilder(User_entity_1.User, "u")
                        .select([
                        "u.user_id as user_id",
                        "u.first_name as first_name",
                        "u.last_name as last_name",
                        "u.email as email",
                        "u.phone as phone",
                        "u.is_active as is_active",
                        "COUNT(DISTINCT l.lead_id) as total_leads",
                        "COUNT(DISTINCT CASE WHEN l.status = 'Signed' THEN l.lead_id END) as signed_leads",
                        "COUNT(DISTINCT v.visit_id) as total_visits",
                        "COUNT(DISTINCT CASE WHEN v.check_out_time IS NOT NULL THEN v.visit_id END) as completed_visits",
                        "COUNT(DISTINCT c.id) as total_contracts",
                    ])
                        .leftJoin(Leads_entity_1.Leads, "l", "l.assigned_rep_id = u.user_id")
                        .leftJoin(Visits_entity_1.Visit, "v", "v.rep_id = u.user_id")
                        .leftJoin(Contracts_entity_1.Contract, "c", "c.visit_id = v.visit_id")
                        .where("u.user_id IN (:...salesRepIds)", { salesRepIds })
                        .groupBy("u.user_id, u.first_name, u.last_name, u.email, u.phone, u.is_active")
                        .getRawMany(),
                ]);
                yield queryRunner.commitTransaction();
                return {
                    data: {
                        salesRepsCount,
                        totalLeads,
                        visitedLeads,
                        unVisitedLeads,
                        signedLeads,
                        unSignedLeads,
                        pendingVisits,
                        completedVisits,
                        totalContracts,
                        salesRepDetails,
                    },
                    status: 200,
                    message: "Manager dashboard data fetched successfully",
                };
            }
            catch (error) {
                console.error("Error in getManagerDashboard:", error);
                yield queryRunner.rollbackTransaction();
                return {
                    data: null,
                    status: 500,
                    message: "Error fetching manager dashboard data",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getSalesRepManagaerList(page, limit, search, managerId, salesmanId) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = (page - 1) * limit;
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const query = dataSource
                    .getRepository(ManagerSalesRep_entity_1.ManagerSalesRep)
                    .createQueryBuilder("msr")
                    .leftJoinAndSelect("msr.manager", "manager")
                    .leftJoinAndSelect("manager.role", "manager_role")
                    .leftJoinAndSelect("manager.address", "manager_address")
                    .leftJoinAndSelect("msr.sales_rep", "sales_rep")
                    .leftJoinAndSelect("sales_rep.role", "sales_rep_role")
                    .leftJoinAndSelect("sales_rep.address", "sales_rep_address")
                    .where("manager.is_active = :managerActive", { managerActive: true })
                    .andWhere("sales_rep.is_active = :salesRepActive", { salesRepActive: true });
                if (search && search.trim() !== "") {
                    const searchTerm = `%${search.trim().toLowerCase()}%`;
                    query.andWhere(`(LOWER(COALESCE(manager.full_name, '')) LIKE :searchTerm
        OR LOWER(COALESCE(manager.email, '')) LIKE :searchTerm
        OR LOWER(COALESCE(manager.first_name, '')) LIKE :searchTerm
        OR LOWER(COALESCE(manager.last_name, '')) LIKE :searchTerm)`, { searchTerm });
                }
                if (managerId) {
                    query.andWhere("manager.user_id = :managerId", { managerId });
                }
                if (salesmanId) {
                    query.andWhere("sales_rep.user_id = :salesmanId", { salesmanId });
                }
                const [results, total] = yield query
                    .orderBy("manager.user_id", "ASC")
                    .skip(skip)
                    .take(limit)
                    .getManyAndCount();
                // Group sales reps by manager
                const groupedData = {};
                for (const entry of results) {
                    const managerId = entry.manager.user_id;
                    if (!groupedData[managerId]) {
                        // Remove password_hash from manager data
                        const _a = entry.manager, { password_hash } = _a, safeManager = __rest(_a, ["password_hash"]);
                        groupedData[managerId] = {
                            manager: safeManager,
                            sales_reps: [],
                        };
                    }
                    // Remove password_hash from sales rep data
                    const _b = entry.sales_rep, { password_hash: salesRepPassword } = _b, safeSalesRep = __rest(_b, ["password_hash"]);
                    groupedData[managerId].sales_reps.push(safeSalesRep);
                }
                return {
                    data: Object.values(groupedData),
                    total: Object.keys(groupedData).length,
                    status: 200,
                    message: "Sales reps grouped by manager retrieved successfully",
                };
            }
            catch (error) {
                console.error(error);
                return {
                    data: null,
                    status: 500,
                    total: 0,
                    message: "Error fetching data",
                };
            }
        });
    }
    getUnassignedSalesRep(org_id_1, _a) {
        return __awaiter(this, arguments, void 0, function* (org_id, { limit, skip, search }) {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const role = yield queryRunner.manager.findOneByOrFail(Role_entity_1.Role, {
                    role_name: roles_1.Roles.SALES_REP,
                });
                const query = queryRunner.manager
                    .getRepository(User_entity_1.User)
                    .createQueryBuilder("user")
                    .leftJoinAndSelect("user.role", "role")
                    .leftJoinAndSelect("user.address", "address")
                    .leftJoin(ManagerSalesRep_entity_1.ManagerSalesRep, "msr", "msr.sales_rep_id = user.user_id")
                    .where("user.role_id = :roleId", { roleId: role.role_id })
                    .andWhere("user.org_id = :orgId", { orgId: org_id })
                    .andWhere("user.is_active = true");
                if (search && search.trim() !== "") {
                    const searchTerm = `%${search.trim().toLowerCase()}%`;
                    query.andWhere(`(LOWER(COALESCE(user.email, '')) LIKE :searchTerm
          OR LOWER(COALESCE(user.full_name, '')) LIKE :searchTerm
          OR LOWER(COALESCE(user.first_name, '')) LIKE :searchTerm
          OR LOWER(COALESCE(user.last_name, '')) LIKE :searchTerm)`, { searchTerm });
                }
                const [users, total] = yield query
                    .orderBy("user.user_id", "ASC")
                    .skip(skip)
                    .take(limit)
                    .getManyAndCount();
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: users.map((_a) => {
                        var { password_hash } = _a, safeUser = __rest(_a, ["password_hash"]);
                        return safeUser;
                    }),
                    total,
                    message: "Sales representatives fetched successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error(error);
                return {
                    status: 500,
                    data: null,
                    total: 0,
                    message: "Failed to fetch sales representatives.",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getUsersByRole(org_id, role, pagination) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const [salesRep, total] = yield userQuery.getAllUsersWithRoleName(queryRunner.manager, org_id, role, pagination.limit, pagination.skip, pagination.search);
                yield queryRunner.commitTransaction();
                const totalPages = Math.ceil(total / pagination.limit);
                const currentPage = Math.floor(pagination.skip / pagination.limit) + 1;
                const previousPage = currentPage > 1 ? currentPage - 1 : null;
                const nextPage = currentPage < totalPages ? currentPage + 1 : null;
                return {
                    status: 200,
                    data: salesRep.map((val) => {
                        let { password_hash } = val, safeUser = __rest(val, ["password_hash"]);
                        return safeUser;
                    }),
                    pagination: {
                        totalPages,
                        previousPage,
                        currentPage,
                        nextPage,
                        totalItems: total,
                    },
                    message: "Users fetched successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.log(error);
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: "An error occurred while fetching user data.",
                    data: null,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                const getUserByIdWithOrganization = yield organizationQuery.getUserByIdWithOrganization(queryRunner.manager, userId);
                if (!getUserByIdWithOrganization) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "User not found",
                    };
                }
                const { password_hash } = getUserByIdWithOrganization, safeUser = __rest(getUserByIdWithOrganization, ["password_hash"]);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: safeUser,
                    message: "",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: "An error occurred while fetching user data.",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    addTeamMember(org_id, user_id, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                const password = yield (0, passwordGenerator_1.generatePassword)();
                const passwordhash = yield bcrypt_1.default.hash(password, SALT_ROUNDS);
                let role_id;
                if (params.role_name) {
                    const existingRole = yield roleQuery.getRoleByNameAndOrgId(queryRunner.manager, params.role_name, org_id);
                    if (existingRole) {
                        role_id = existingRole.role_id;
                    }
                    else {
                        const newRole = yield roleQuery.saveRole(queryRunner.manager, {
                            role_name: params.role_name,
                            org_id,
                        });
                        role_id = newRole.role_id;
                    }
                }
                else {
                    role_id = params.role_id;
                }
                const findRole = yield roleQuery.getRoleByIdAndOrgId(role_id, org_id);
                if (!findRole) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 500,
                        message: "Role not found",
                    };
                }
                const newUser = yield userQuery.createUser(queryRunner.manager, {
                    role_id: role_id,
                    email: params.email,
                    org_id,
                    phone: params.phone,
                    first_name: params.first_name,
                    last_name: params.last_name,
                    is_email_verified: 1,
                    is_active: true,
                    is_admin: findRole.role_name === roles_1.Roles.ADMIN ? 1 : 0,
                    password_hash: passwordhash,
                    created_by: String(user_id).trim(),
                });
                yield this.SendEmailNotification(params.email, password);
                const { password_hash } = newUser, safeUser = __rest(newUser, ["password_hash"]);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: safeUser,
                    message: "User created successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: typeof error === "object" && error !== null && "message" in error
                        ? error.message
                        : "Error creating user profile",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getAllTeamMember(org_id, pagination) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                const [users, total] = yield userQuery.getAllUsersWithRoles(queryRunner.manager, org_id, pagination.limit, pagination.skip, pagination.search, pagination.role, pagination.status);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: users.map((val) => {
                        let { password_hash } = val, safeUser = __rest(val, ["password_hash"]);
                        return safeUser;
                    }),
                    total,
                    message: "Users fetched successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: "Error fetching users",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getTeamMemberById(org_id, user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                const result = yield userQuery.getUserById(queryRunner.manager, org_id, user_id);
                if (!result) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "User not found",
                    };
                }
                const { password_hash } = result, safeUser = __rest(result, ["password_hash"]);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: safeUser,
                    message: "User fetched successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: "Error fetching user",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    editTeamMember(org_id, user_id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                // Check if user exists
                const existingUser = yield userQuery.getUserById(queryRunner.manager, org_id, user_id);
                if (!existingUser) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "User not found",
                    };
                }
                // Handle role assignment
                let role_id = (updateData === null || updateData === void 0 ? void 0 : updateData.role_id)
                    ? updateData === null || updateData === void 0 ? void 0 : updateData.role_id
                    : existingUser.role_id;
                if (updateData.role_name) {
                    const existingRole = yield roleQuery.getRoleByNameAndOrgId(queryRunner.manager, updateData.role_name, org_id);
                    if (existingRole) {
                        role_id = existingRole.role_id;
                    }
                    else {
                        const newRole = yield roleQuery.saveRole(queryRunner.manager, {
                            role_name: updateData.role_name,
                            org_id,
                        });
                        role_id = newRole.role_id;
                    }
                }
                // Remove non-user columns from updateData
                const { role_name } = updateData, updatedFields = __rest(updateData, ["role_name"]);
                updatedFields.role_id = role_id;
                const findRole = yield roleQuery.getRoleById(updatedFields.role_id, queryRunner.manager);
                if (!findRole) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 500,
                        message: "Role not found",
                    };
                }
                // Update user in DB
                const updatedUser = yield userQuery.updateUser(queryRunner.manager, org_id, user_id, Object.assign(Object.assign({}, updatedFields), { is_admin: findRole.role_name === roles_1.Roles.ADMIN ? 1 : 0 }));
                if (!updatedUser) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "User not found",
                    };
                }
                const { password_hash } = updatedUser, safeUser = __rest(updatedUser, ["password_hash"]);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: safeUser,
                    message: "User updated successfully",
                };
            }
            catch (error) {
                console.error(error);
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: "Error updating user profile",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    activeDeactive(org_id, user_id, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                const existingUser = yield userQuery.getUserByIdAllStatus(queryRunner.manager, org_id, params.id);
                if (!existingUser) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "User not found",
                    };
                }
                if (!params.status) {
                    yield userTokenQuery.deleteUserTokens(queryRunner.manager, params.id);
                }
                yield userQuery.activeDeactiveUser(queryRunner.manager, org_id, params.id, params.status, user_id);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    message: "User status successfully updated.",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: 500,
                    message: typeof error === "object" && error !== null && "message" in error
                        ? error.message
                        : "Error creating user profile",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    updateProfile(org_id, user_id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!org_id || !user_id) {
                return {
                    status: 400,
                    message: "Invalid organization or user ID",
                };
            }
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            try {
                yield queryRunner.startTransaction();
                const existingUser = yield userQuery.getUserById(queryRunner.manager, org_id, user_id);
                if (!existingUser) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "User not found",
                    };
                }
                let updatedAddress;
                if (updateData.address) {
                    const addressData = updateData.address;
                    const hasAddressFields = Object.values(addressData).some((value) => value !== undefined && value !== null);
                    if (existingUser.address_id) {
                        yield addressQuery.updateAddress(queryRunner.manager, existingUser.address_id, addressData, org_id);
                        updatedAddress = yield addressQuery.getAddressById(queryRunner.manager, existingUser.address_id);
                    }
                    else if (hasAddressFields) {
                        let coords = {
                            latitude: addressData.latitude,
                            longitude: addressData.longitude,
                        };
                        if (!addressData.latitude || !addressData.longitude) {
                            coords = yield geocodingService.getCoordinates({
                                street_address: addressData.street_address,
                                postal_code: addressData.postal_code,
                                subregion: addressData.subregion,
                                region: addressData.region,
                                city: addressData.city,
                                state: addressData.state,
                                country: addressData.country || "Finland",
                            });
                        }
                        const newAddressData = {
                            street_address: addressData.street_address || "",
                            postal_code: addressData.postal_code || "",
                            area_name: addressData.area_name || "",
                            subregion: addressData.subregion || "",
                            region: addressData.region || "",
                            country: addressData.country || "",
                            org_id: org_id,
                            city: addressData.city || "",
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            state: addressData.state || "",
                            comments: addressData.comments || "",
                        };
                        updatedAddress = yield addressQuery.createAddress(queryRunner.manager, newAddressData, org_id);
                        if (updatedAddress === null || updatedAddress === void 0 ? void 0 : updatedAddress.address_id) {
                            updateData.address_id = updatedAddress.address_id;
                            yield territoryService.autoAssignTerritory(updatedAddress.address_id, org_id, queryRunner);
                        }
                    }
                    delete updateData.address;
                }
                const { role_name } = updateData, updatedFields = __rest(updateData, ["role_name"]);
                const updatedUser = yield userQuery.updateUser(queryRunner.manager, org_id, user_id, updatedFields);
                if (!updatedUser) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: 404,
                        message: "Failed to update user",
                    };
                }
                const { password_hash } = updatedUser, safeUser = __rest(updatedUser, ["password_hash"]);
                yield queryRunner.commitTransaction();
                return {
                    status: 200,
                    data: safeUser,
                    message: "User updated successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("Error updating user profile:", error);
                return {
                    status: 500,
                    message: "Error updating user profile",
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
}
exports.UserTeamService = UserTeamService;
