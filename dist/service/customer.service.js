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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const data_source_1 = require("../config/data-source"); // Updated import
const leadStatus_1 = require("../enum/leadStatus"); // Fixed enum import (assuming Source is the correct enum)
const common_interface_1 = require("../interfaces/common.interface");
const User_entity_1 = require("../models/User.entity");
const Role_entity_1 = require("../models/Role.entity");
const Leads_entity_1 = require("../models/Leads.entity");
const Address_entity_1 = require("../models/Address.entity");
const http_status_codes_1 = __importDefault(require("http-status-codes"));
const address_service_1 = require("./address.service");
const territory_service_1 = require("./territory.service");
const roles_1 = require("../enum/roles");
const timezone_1 = require("../utils/timezone");
const TerritorySalesMan_entity_1 = require("../models/TerritorySalesMan.entity");
const Territory_entity_1 = require("../models/Territory.entity");
const typeorm_1 = require("typeorm");
const geoCode_service_1 = require("../utils/geoCode.service");
const ManagerSalesRep_entity_1 = require("../models/ManagerSalesRep.entity");
const addressService = new address_service_1.AddressService();
const territoryService = new territory_service_1.TerritoryService();
const geoCodeingService = new geoCode_service_1.GeocodingService();
class CustomerService {
    createCustomer(data, userId, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const customerData = new common_interface_1.LeadImportDto();
                Object.assign(customerData, data);
                const existingAddress = yield queryRunner.manager.findOne(Address_entity_1.Address, {
                    where: {
                        postal_code: data.postal_code,
                        street_address: data.street_address,
                        subregion: data.subregion,
                        org_id: org_id,
                    },
                });
                if (existingAddress) {
                    const existingCustomer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                        where: {
                            address_id: existingAddress.address_id,
                            is_active: true,
                            org_id: data.org_id,
                        },
                    });
                    if (existingCustomer) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.CONFLICT,
                            message: `Customer with address ${data.street_address}, ${data.postal_code}, ${data.subregion} already exists`,
                        };
                    }
                }
                const existingEmail = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                    where: { contact_email: data.contact_email, is_active: true },
                });
                const addressData = {
                    street_address: data.street_address || "",
                    postal_code: data.postal_code || "",
                    area_name: data.area_name || "",
                    subregion: data.subregion || "",
                    region: data.region || "",
                    country: data.country || "Finland",
                    org_id: org_id,
                    city: data.city || "",
                    state: data.state || "",
                    comments: data.comments || "",
                };
                const addressResponse = yield addressService.createAddress(addressData, userId, org_id);
                if (addressResponse.status >= 400) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: addressResponse.status,
                        message: `Failed to create address`,
                    };
                }
                const address = addressResponse.data;
                const territory = yield territoryService.assignTerritory({
                    postal_code: (_a = addressResponse.data) === null || _a === void 0 ? void 0 : _a.postal_code,
                    subregion: (_b = addressResponse.data) === null || _b === void 0 ? void 0 : _b.subregion,
                    lat: (_c = addressResponse.data) === null || _c === void 0 ? void 0 : _c.latitude,
                    lng: (_d = addressResponse.data) === null || _d === void 0 ? void 0 : _d.longitude,
                    org_id: org_id,
                });
                let savedAddress;
                if (territory) {
                    address.territory_id = territory.territory_id;
                    address.polygon_id = territory.polygon_id || undefined;
                    savedAddress = yield queryRunner.manager.save(Address_entity_1.Address, address);
                }
                const customer = new Leads_entity_1.Leads();
                customer.name = (_e = data.name) !== null && _e !== void 0 ? _e : "";
                customer.contact_name = (_f = data.contact_name) !== null && _f !== void 0 ? _f : "";
                customer.contact_email = (_g = data.contact_email) !== null && _g !== void 0 ? _g : "";
                customer.contact_phone = (_h = data.contact_phone) !== null && _h !== void 0 ? _h : "";
                customer.address_id = ((_j = savedAddress === null || savedAddress === void 0 ? void 0 : savedAddress.address_id) !== null && _j !== void 0 ? _j : (_k = addressResponse.data) === null || _k === void 0 ? void 0 : _k.address_id);
                customer.assigned_rep_id = userId;
                customer.status = leadStatus_1.LeadStatus.Prospect;
                customer.pending_assignment = false;
                customer.is_active = true;
                customer.source = leadStatus_1.Source.Manual;
                customer.created_by = userId.toString();
                customer.updated_by = userId.toString();
                customer.org_id = org_id;
                const savedCustomer = yield queryRunner.manager.save(Leads_entity_1.Leads, customer);
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.CREATED,
                    data: savedCustomer,
                    message: "Customer created successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to create customer: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    updateCustomer(customerId, data, userId, org_id, role_id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const role = yield queryRunner.manager.findOne(Role_entity_1.Role, {
                    where: { role_id },
                });
                if (!role) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Role not found",
                    };
                }
                const customer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                    where: { lead_id: customerId, is_active: true, org_id },
                    select: [
                        "lead_id",
                        "assigned_rep_id",
                        "contact_name",
                        "contact_email",
                        "contact_phone",
                        "name",
                        "address_id",
                        "status",
                        "org_id",
                    ],
                });
                console.log("data", data);
                if (!customer) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Customer not found",
                    };
                }
                if (role.role_name === roles_1.Roles.SALES_REP && customer.assigned_rep_id !== userId) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.FORBIDDEN,
                        message: "Access denied: You are not assigned to this customer",
                    };
                }
                let addressId = customer.address_id;
                const updateData = {
                    updated_by: userId.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                };
                if (role.role_name === roles_1.Roles.SALES_REP) {
                    if (data.contact_name)
                        updateData.contact_name = data.contact_name;
                    if (data.contact_email)
                        updateData.contact_email = data.contact_email;
                    if (data.contact_phone)
                        updateData.contact_phone = data.contact_phone;
                    if (data.name)
                        updateData.name = data.name;
                    if (data.status) {
                        // Uncomment if sales reps are restricted to Active status
                        // if (data.status !== LeadStatus.Active) {
                        //   await queryRunner.rollbackTransaction();
                        //   return {
                        //     status: httpStatusCodes.FORBIDDEN,
                        //     message: "Sales reps can only change status to Active",
                        //   };
                        // }
                        updateData.status = data.status;
                    }
                }
                else {
                    if (data.contact_name)
                        updateData.contact_name = data.contact_name;
                    if (data.contact_email)
                        updateData.contact_email = data.contact_email;
                    if (data.contact_phone)
                        updateData.contact_phone = data.contact_phone;
                    if (data.name)
                        updateData.name = data.name;
                    if (data.status)
                        updateData.status = data.status;
                    const hasAddressUpdate = ((_a = data.address) === null || _a === void 0 ? void 0 : _a.street_address) !== undefined ||
                        ((_b = data.address) === null || _b === void 0 ? void 0 : _b.postal_code) !== undefined ||
                        ((_c = data.address) === null || _c === void 0 ? void 0 : _c.subregion) !== undefined ||
                        ((_d = data.address) === null || _d === void 0 ? void 0 : _d.region) !== undefined ||
                        ((_e = data.address) === null || _e === void 0 ? void 0 : _e.country) !== undefined ||
                        ((_f = data.address) === null || _f === void 0 ? void 0 : _f.area_name) !== undefined ||
                        ((_g = data.address) === null || _g === void 0 ? void 0 : _g.city) !== undefined ||
                        ((_h = data.address) === null || _h === void 0 ? void 0 : _h.state) !== undefined ||
                        ((_j = data.address) === null || _j === void 0 ? void 0 : _j.comments) !== undefined ||
                        ((_k = data.address) === null || _k === void 0 ? void 0 : _k.latitude) !== undefined ||
                        ((_l = data.address) === null || _l === void 0 ? void 0 : _l.longitude) !== undefined ||
                        ((_m = data.address) === null || _m === void 0 ? void 0 : _m.landmark) !== undefined;
                    console.log("address_id", customer.address_id, hasAddressUpdate);
                    if (hasAddressUpdate) {
                        const address = yield queryRunner.manager.findOne(Address_entity_1.Address, {
                            where: { address_id: customer.address_id, is_active: true },
                            select: [
                                "address_id",
                                "street_address",
                                "postal_code",
                                "area_name",
                                "subregion",
                                "region",
                                "country",
                                "city",
                                "state",
                                "comments",
                                "latitude",
                                "longitude",
                                "landmark",
                            ],
                        });
                        if (!address) {
                            yield queryRunner.rollbackTransaction();
                            return {
                                status: http_status_codes_1.default.NOT_FOUND,
                                message: "Address not found",
                            };
                        }
                        const addressUpdate = {
                            street_address: ((_o = data.address) === null || _o === void 0 ? void 0 : _o.street_address) !== undefined ? data.address.street_address : address.street_address,
                            postal_code: ((_p = data.address) === null || _p === void 0 ? void 0 : _p.postal_code) !== undefined ? data.address.postal_code : address.postal_code,
                            area_name: ((_q = data.address) === null || _q === void 0 ? void 0 : _q.area_name) !== undefined ? data.address.area_name : address.area_name,
                            subregion: ((_r = data.address) === null || _r === void 0 ? void 0 : _r.subregion) !== undefined ? data.address.subregion : (((_s = data.address) === null || _s === void 0 ? void 0 : _s.city) !== undefined ? data.address.city : address.subregion),
                            region: ((_t = data.address) === null || _t === void 0 ? void 0 : _t.region) !== undefined ? data.address.region : (((_u = data.address) === null || _u === void 0 ? void 0 : _u.state) !== undefined ? data.address.state : address.region),
                            country: ((_v = data.address) === null || _v === void 0 ? void 0 : _v.country) !== undefined ? data.address.country : address.country,
                            city: ((_w = data.address) === null || _w === void 0 ? void 0 : _w.city) !== undefined ? data.address.city : (((_x = data.address) === null || _x === void 0 ? void 0 : _x.subregion) !== undefined ? data.address.subregion : address.city),
                            state: ((_y = data.address) === null || _y === void 0 ? void 0 : _y.state) !== undefined ? data.address.state : (((_z = data.address) === null || _z === void 0 ? void 0 : _z.region) !== undefined ? data.address.region : address.state),
                            comments: ((_0 = data.address) === null || _0 === void 0 ? void 0 : _0.comments) !== undefined ? data.address.comments : address.comments,
                            latitude: ((_1 = data.address) === null || _1 === void 0 ? void 0 : _1.latitude) !== undefined ? data.address.latitude : address.latitude,
                            longitude: ((_2 = data.address) === null || _2 === void 0 ? void 0 : _2.longitude) !== undefined ? data.address.longitude : address.longitude,
                            landmark: ((_3 = data.address) === null || _3 === void 0 ? void 0 : _3.landmark) !== undefined ? data.address.landmark : address.landmark,
                            updated_by: userId.toString(),
                            updated_at: (0, timezone_1.getFinnishTime)(),
                        };
                        const addressUpdateResult = yield queryRunner.manager.update(Address_entity_1.Address, { address_id: address.address_id }, addressUpdate);
                        if (addressUpdateResult.affected === 0) {
                            console.warn("⚠️ Address update failed: No rows affected");
                            yield queryRunner.rollbackTransaction();
                            return {
                                status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                                message: "Failed to update address",
                            };
                        }
                    }
                }
                if (Object.keys(updateData).length > 2) {
                    const leadUpdateResult = yield queryRunner.manager.update(Leads_entity_1.Leads, { lead_id: customerId }, updateData);
                    if (leadUpdateResult.affected === 0) {
                        console.warn("⚠️ Lead update failed: No rows affected");
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                            message: "Failed to update customer",
                        };
                    }
                }
                if (data.street_address || data.postal_code || ((_4 = data.address) === null || _4 === void 0 ? void 0 : _4.subregion)) {
                    const autoAssignResult = yield territoryService.autoAssignTerritory(addressId, org_id, queryRunner // Pass the queryRunner
                    );
                    if (autoAssignResult.status >= 400) {
                        yield queryRunner.rollbackTransaction();
                        return {
                            status: autoAssignResult.status,
                            message: `Failed to auto-assign territory: ${autoAssignResult.message}`,
                        };
                    }
                }
                const updatedCustomer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                    where: { lead_id: customerId, is_active: true },
                    select: [
                        "lead_id",
                        "contact_name",
                        "contact_email",
                        "contact_phone",
                        "name",
                        "address_id",
                        "status",
                        "org_id",
                        "updated_by",
                        "updated_at",
                    ],
                    relations: {
                        address: true,
                    },
                    relationLoadStrategy: "join",
                });
                if (!updatedCustomer) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Updated customer not found",
                    };
                }
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: updatedCustomer,
                    message: "Customer updated successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                console.error("updateCustomer - Error:", error.message, error.stack);
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to update customer: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    deleteCustomer(customerId, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const customer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                    where: { lead_id: customerId, is_active: true },
                });
                if (!customer) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Customer not found",
                    };
                }
                yield queryRunner.manager.update(Leads_entity_1.Leads, { lead_id: customerId }, {
                    is_active: false,
                    updated_by: adminId.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                });
                yield queryRunner.manager.update(Address_entity_1.Address, { address_id: customer.address_id }, {
                    is_active: false,
                    updated_by: adminId.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    message: "Customer deleted successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to delete customer: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    deleteBulkCustomer(customerIds, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const customers = yield queryRunner.manager.find(Leads_entity_1.Leads, {
                    where: { lead_id: (0, typeorm_1.In)(customerIds), is_active: true },
                });
                if (customers.length === 0) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Customers not found",
                    };
                }
                yield queryRunner.manager.update(Leads_entity_1.Leads, { lead_id: (0, typeorm_1.In)(customerIds) }, {
                    is_active: false,
                    updated_by: adminId.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                });
                const addressIds = customers
                    .map((customer) => customer.address_id)
                    .filter(Boolean);
                if (addressIds.length > 0) {
                    yield queryRunner.manager.update(Address_entity_1.Address, { address_id: (0, typeorm_1.In)(addressIds) }, {
                        is_active: false,
                        updated_by: adminId.toString(),
                        updated_at: (0, timezone_1.getFinnishTime)(),
                    });
                }
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    message: "Customers deleted successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to delete customers: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    getCustomerById(customerId, userId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const customer = yield dataSource.manager.findOne(Leads_entity_1.Leads, {
                    where: { lead_id: customerId, is_active: true },
                    relations: ["address"],
                });
                if (!customer) {
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Customer not found",
                    };
                }
                if (role === roles_1.Roles.SALES_REP && customer.assigned_rep_id !== userId) {
                    return {
                        status: http_status_codes_1.default.FORBIDDEN,
                        message: "Access denied: You are not assigned to this customer",
                    };
                }
                return {
                    status: http_status_codes_1.default.OK,
                    data: customer,
                    message: "Customer retrieved successfully",
                };
            }
            catch (error) {
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to retrieve customer: ${error.message}`,
                };
            }
        });
    }
    getAllCustomers(filters, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const dataSource = yield (0, data_source_1.getDataSource)();
            try {
                const search = (_a = filters.search) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
                const source = ((_b = filters.source) === null || _b === void 0 ? void 0 : _b.trim()) || undefined;
                const user = yield dataSource
                    .getRepository(User_entity_1.User)
                    .findOne({ where: { user_id: userId }, relations: { role: true } });
                if (!user) {
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "User not found",
                        data: null,
                        total: 0,
                    };
                }
                const query = dataSource.manager
                    .createQueryBuilder(Leads_entity_1.Leads, "leads")
                    .leftJoinAndSelect("leads.address", "address")
                    .where("leads.is_active = :isActive", { isActive: true });
                const prospectLeadStatus = leadStatus_1.LeadStatus.Prospect;
                if (user.role.role_name === roles_1.Roles.SALES_REP) {
                    query
                        .andWhere("leads.assigned_rep_id = :userId", { userId })
                        .andWhere("leads.status = :status", { status: prospectLeadStatus });
                }
                if (filters.salesmanId) {
                    query.andWhere("leads.assigned_rep_id = :salesmanId", {
                        salesmanId: filters.salesmanId,
                    });
                }
                if (filters.managerId) {
                    const managerSalesReps = yield dataSource
                        .getRepository(ManagerSalesRep_entity_1.ManagerSalesRep)
                        .find({
                        where: { manager_id: filters.managerId },
                        relations: ["sales_rep"],
                    });
                    const salesRepIds = managerSalesReps.map((r) => r.sales_rep.user_id);
                    if (salesRepIds.length > 0) {
                        query.andWhere("leads.assigned_rep_id IN (:...salesRepIds)", {
                            salesRepIds,
                        });
                    }
                    else {
                        return {
                            status: http_status_codes_1.default.OK,
                            data: [],
                            message: "No leads found for this manager",
                            total: 0,
                        };
                    }
                }
                // Filter by search
                if (search) {
                    query.andWhere(new typeorm_1.Brackets((qb) => {
                        qb.where("LOWER(leads.name) LIKE :search", {
                            search: `%${search}%`,
                        })
                            .orWhere("LOWER(leads.contact_name) LIKE :search", {
                            search: `%${search}%`,
                        })
                            .orWhere("LOWER(leads.contact_email) LIKE :search", {
                            search: `%${search}%`,
                        })
                            .orWhere("LOWER(address.street_address) LIKE :search", {
                            search: `%${search}%`,
                        })
                            .orWhere("LOWER(address.country) LIKE :search", {
                            search: `%${search}%`,
                        })
                            .orWhere("LOWER(address.city) LIKE :search", {
                            search: `%${search}%`,
                        })
                            .orWhere("LOWER(address.postal_code) LIKE :search", {
                            search: `%${search}%`,
                        });
                    }));
                }
                // Filter by source
                if (source) {
                    query.andWhere("leads.source = :source", { source });
                }
                // Pagination and sorting
                query
                    .skip(filters.skip)
                    .take(filters.limit)
                    .orderBy("leads.created_at", "DESC");
                const [customers, total] = yield query.getManyAndCount();
                return {
                    status: http_status_codes_1.default.OK,
                    data: customers,
                    message: "Customers retrieved successfully",
                    total,
                };
            }
            catch (error) {
                console.error("Error retrieving customers:", error);
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to retrieve customers: ${error.message}`,
                    data: null,
                    total: 0,
                };
            }
        });
    }
    bulkAssignCustomers(customerIds, repId, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const rep = yield queryRunner.manager.findOne(User_entity_1.User, {
                    where: { user_id: repId, role: { role_name: roles_1.Roles.SALES_REP } },
                });
                if (!rep) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Invalid sales rep",
                    };
                }
                const updatedCustomers = [];
                const errors = [];
                for (const customerId of customerIds) {
                    const customer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                        where: { lead_id: customerId, is_active: true },
                    });
                    if (!customer) {
                        errors.push(`Customer with ID ${customerId} not found`);
                        continue;
                    }
                    yield queryRunner.manager.update(Leads_entity_1.Leads, { lead_id: customerId }, {
                        assigned_rep_id: repId,
                        pending_assignment: false,
                        updated_by: adminId.toString(),
                        updated_at: (0, timezone_1.getFinnishTime)(),
                    });
                    const updatedCustomer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                        where: { lead_id: customerId },
                        relations: ["address"],
                    });
                    updatedCustomers.push(updatedCustomer);
                }
                if (errors.length && !updatedCustomers.length) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "No customers assigned",
                        errors,
                    };
                }
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: updatedCustomers,
                    message: "Customers assigned successfully",
                    errors: errors.length ? errors : undefined,
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to assign customers: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    importCustomers(data_1, adminId_1, org_id_1) {
        return __awaiter(this, arguments, void 0, function* (data, adminId, org_id, batchSize = 500) {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            const addresses = [];
            const customers = [];
            const errors = [];
            try {
                // Input validation
                if (!data || !data.length) {
                    errors.push("Row 0: Empty input data provided");
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Import failed: No data provided",
                        data: null,
                        errors,
                    };
                }
                // Fetch territories
                const territories = yield dataSource.manager
                    .find(Territory_entity_1.Territory, {
                    where: { org_id, is_active: true },
                    select: ["territory_id", "regions", "subregions", "postal_codes"],
                })
                    .catch((e) => {
                    throw new Error(`Territory fetch failed: ${e.message}`);
                });
                const territoryLookup = new Map();
                territories.forEach((territory) => {
                    const { territory_id } = territory;
                    try {
                        if (territory.postal_codes) {
                            JSON.parse(territory.postal_codes).forEach((code) => territoryLookup.set(`postal:${code}`, territory_id));
                        }
                        if (territory.regions) {
                            JSON.parse(territory.regions).forEach((region) => territoryLookup.set(`region:${region}`, territory_id));
                        }
                        if (territory.subregions) {
                            JSON.parse(territory.subregions).forEach((subregion) => territoryLookup.set(`subregion:${subregion}`, territory_id));
                        }
                    }
                    catch (e) {
                        errors.push(`Row 0: Invalid JSON for territory ID ${territory_id}: ${e.message}`);
                    }
                });
                const geocodeCache = new Map();
                for (let i = 0; i < data.length; i += batchSize) {
                    yield queryRunner.startTransaction();
                    try {
                        const batch = data.slice(i, i + batchSize);
                        const addressKeys = batch.map((row, idx) => {
                            var _a, _b, _c, _d;
                            if (!row.postal_code || !row.street_address) {
                                errors.push(`Row ${i + idx + 1}: Missing postal code or street address`);
                            }
                            return {
                                postal_code: ((_a = row.postal_code) === null || _a === void 0 ? void 0 : _a.trim()) || "00000",
                                street_address: ((_b = row.street_address) === null || _b === void 0 ? void 0 : _b.trim()) || "",
                                subregion: ((_c = row.subregion) === null || _c === void 0 ? void 0 : _c.trim()) || ((_d = row.city) === null || _d === void 0 ? void 0 : _d.trim()) || "",
                                org_id,
                            };
                        });
                        const existingAddresses = yield queryRunner.manager
                            .find(Address_entity_1.Address, {
                            where: addressKeys,
                            select: [
                                "address_id",
                                "postal_code",
                                "street_address",
                                "subregion",
                                "org_id",
                                "territory_id",
                                "comments",
                            ],
                        })
                            .catch((e) => {
                            throw new Error(`Address fetch failed: ${e.message}`);
                        });
                        const addressMap = new Map(existingAddresses.map((addr) => [
                            `${addr.postal_code}|${addr.street_address}|${addr.subregion}|${org_id}`,
                            addr,
                        ]));
                        const addressIds = existingAddresses.map((addr) => addr.address_id);
                        const existingLeads = addressIds.length
                            ? yield queryRunner.manager
                                .find(Leads_entity_1.Leads, {
                                where: { address_id: (0, typeorm_1.In)(addressIds), is_active: true },
                                select: ["address_id"],
                            })
                                .catch((e) => {
                                throw new Error(`Leads fetch failed: ${e.message}`);
                            })
                            : [];
                        const leadAddressMap = new Map(existingLeads.map((lead) => [lead.address_id, lead.name]));
                        const newAddresses = [];
                        const addressesToUpdate = [];
                        const newCustomers = [];
                        const customerToAddressIndex = new Map();
                        const addressesToGeocode = [];
                        batch.forEach((row, index) => {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                            const rowNum = i + index + 1;
                            const addressData = {
                                street_address: ((_a = row.street_address) === null || _a === void 0 ? void 0 : _a.trim()) || "",
                                comments: ((_b = row.comments) === null || _b === void 0 ? void 0 : _b.trim()) || "",
                                postal_code: ((_c = row.postal_code) === null || _c === void 0 ? void 0 : _c.trim()) || "00000",
                                area_name: ((_d = row.area_name) === null || _d === void 0 ? void 0 : _d.trim()) || "",
                                city: ((_e = row.city) === null || _e === void 0 ? void 0 : _e.trim()) || "",
                                state: ((_f = row.state) === null || _f === void 0 ? void 0 : _f.trim()) || "",
                                subregion: ((_g = row.subregion) === null || _g === void 0 ? void 0 : _g.trim()) || ((_h = row.city) === null || _h === void 0 ? void 0 : _h.trim()) || "",
                                region: ((_j = row.region) === null || _j === void 0 ? void 0 : _j.trim()) || ((_k = row.state) === null || _k === void 0 ? void 0 : _k.trim()) || "",
                                country: ((_l = row.country) === null || _l === void 0 ? void 0 : _l.trim()) || "Finland",
                            };
                            // Skip invalid rows
                            if (!addressData.street_address || !addressData.postal_code) {
                                return;
                            }
                            const territoryId = territoryLookup.get(`postal:${addressData.postal_code}`) ||
                                territoryLookup.get(`region:${addressData.region}`) ||
                                territoryLookup.get(`subregion:${addressData.subregion}`) ||
                                null;
                            const addressKey = `${addressData.postal_code}|${addressData.street_address}|${addressData.subregion}|${org_id}`;
                            const existingAddress = addressMap.get(addressKey);
                            let address;
                            if (existingAddress) {
                                if (leadAddressMap.has(existingAddress.address_id)) {
                                    errors.push(`Row ${rowNum}: Duplicate customer at ${addressData.street_address}, ${addressData.postal_code}, ${addressData.subregion}`);
                                    return;
                                }
                                existingAddress.comments =
                                    addressData.comments || existingAddress.comments;
                                existingAddress.territory_id =
                                    territoryId || existingAddress.territory_id;
                                addressesToUpdate.push(existingAddress);
                                address = existingAddress;
                            }
                            else {
                                const newAddress = queryRunner.manager.create(Address_entity_1.Address, {
                                    street_address: addressData.street_address,
                                    postal_code: addressData.postal_code,
                                    area_name: addressData.area_name,
                                    subregion: addressData.subregion,
                                    region: addressData.region,
                                    country: addressData.country,
                                    org_id,
                                    city: addressData.city,
                                    state: addressData.state,
                                    comments: addressData.comments,
                                    territory_id: territoryId,
                                    latitude: 0,
                                    longitude: 0,
                                    created_by: adminId.toString(),
                                    updated_by: adminId.toString(),
                                    is_active: true,
                                });
                                newAddresses.push(newAddress);
                                addressesToGeocode.push({
                                    index: newAddresses.length - 1,
                                    address: addressData,
                                });
                                address = newAddress;
                            }
                            addresses.push(address);
                            const customer = queryRunner.manager.create(Leads_entity_1.Leads, {
                                pending_assignment: true,
                                is_active: true,
                                name: "",
                                created_by: adminId.toString(),
                                updated_by: adminId.toString(),
                                org_id,
                                source: leadStatus_1.Source.Excel,
                                address_id: existingAddress
                                    ? existingAddress.address_id
                                    : undefined,
                                territory_id: territoryId,
                            });
                            newCustomers.push(customer);
                            customerToAddressIndex.set(newCustomers.length - 1, newAddresses.length - 1);
                        });
                        if (addressesToGeocode.length) {
                            const geocodePromises = addressesToGeocode.map((_a) => __awaiter(this, [_a], void 0, function* ({ index, address }) {
                                const cacheKey = `${address.street_address}|${address.postal_code}|${address.subregion}|${address.country}`;
                                if (geocodeCache.has(cacheKey)) {
                                    return { index, coords: geocodeCache.get(cacheKey) };
                                }
                                try {
                                    const coords = yield geoCodeingService.getCoordinates(address);
                                    geocodeCache.set(cacheKey, coords);
                                    return { index, coords };
                                }
                                catch (e) {
                                    errors.push(`Row ${i + index + 1}: Geocoding failed for ${address.street_address}, ${address.postal_code}, ${address.subregion}: ${e.message}`);
                                    return { index, coords: { latitude: 0, longitude: 0 } };
                                }
                            }));
                            const geocodeResults = yield Promise.all(geocodePromises);
                            geocodeResults.forEach(({ index, coords }) => {
                                newAddresses[index].latitude = coords.latitude;
                                newAddresses[index].longitude = coords.longitude;
                            });
                        }
                        if (newAddresses.length) {
                            const savedAddresses = yield queryRunner.manager
                                .save(Address_entity_1.Address, newAddresses)
                                .catch((e) => {
                                throw new Error(`Address save failed: ${e.message}`);
                            });
                            newCustomers.forEach((customer, customerIndex) => {
                                const addressIndex = customerToAddressIndex.get(customerIndex);
                                if (addressIndex !== undefined && savedAddresses[addressIndex]) {
                                    customer.address_id = savedAddresses[addressIndex].address_id;
                                    customer.address = savedAddresses[addressIndex];
                                }
                            });
                            addresses.splice(addresses.length - newAddresses.length, newAddresses.length, ...savedAddresses);
                        }
                        if (addressesToUpdate.length) {
                            yield queryRunner.manager
                                .save(Address_entity_1.Address, addressesToUpdate)
                                .catch((e) => {
                                throw new Error(`Address update failed: ${e.message}`);
                            });
                        }
                        const territoryIds = [
                            ...new Set(newCustomers.map((c) => c.territory_id).filter((id) => id)),
                        ];
                        const territorySalesmen = territoryIds.length
                            ? yield queryRunner.manager
                                .find(TerritorySalesMan_entity_1.TerritorySalesman, {
                                where: { territory_id: (0, typeorm_1.In)(territoryIds) },
                                select: ["territory_id", "salesman_id"],
                            })
                                .catch((e) => {
                                throw new Error(`Territory salesmen fetch failed: ${e.message}`);
                            })
                            : [];
                        const salesmanMap = new Map(territorySalesmen.map((ts) => [ts.territory_id, ts.salesman_id]));
                        newCustomers.forEach((customer) => {
                            if (customer.territory_id &&
                                salesmanMap.has(customer.territory_id)) {
                                customer.assigned_rep_id = salesmanMap.get(customer.territory_id);
                                customer.pending_assignment = false;
                            }
                        });
                        // Bulk insert new customers
                        if (newCustomers.length) {
                            const savedCustomers = yield queryRunner.manager
                                .save(Leads_entity_1.Leads, newCustomers)
                                .catch((e) => {
                                throw new Error(`Customer save failed: ${e.message}`);
                            });
                            customers.push(...savedCustomers);
                        }
                        yield queryRunner.commitTransaction();
                    }
                    catch (e) {
                        yield queryRunner.rollbackTransaction();
                        errors.push(`Batch ${i / batchSize + 1}: Processing failed - ${e.message}`);
                    }
                }
                // Response logic
                if (addresses.length || customers.length) {
                    return {
                        status: http_status_codes_1.default.OK,
                        message: errors.length ? "Failed to import leads" : "",
                        data: { addresses, customers },
                        errors: errors.length ? errors : undefined,
                    };
                }
                else {
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Import failed: No valid data processed",
                        data: null,
                        errors,
                    };
                }
            }
            catch (e) {
                errors.push(`Server error: ${e.message}`);
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: "Import failed: Server error",
                    data: null,
                    errors,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
    assignCustomer(customerId, repId, managerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dataSource = yield (0, data_source_1.getDataSource)();
            const queryRunner = dataSource.createQueryRunner();
            yield queryRunner.startTransaction();
            try {
                const customer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                    where: {
                        lead_id: customerId,
                        pending_assignment: true,
                        is_active: true,
                    },
                });
                if (!customer) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.NOT_FOUND,
                        message: "Customer not found or not pending assignment",
                    };
                }
                const rep = yield queryRunner.manager.findOne(User_entity_1.User, {
                    where: { user_id: repId, role: { role_name: roles_1.Roles.SALES_REP } },
                });
                if (!rep) {
                    yield queryRunner.rollbackTransaction();
                    return {
                        status: http_status_codes_1.default.BAD_REQUEST,
                        message: "Invalid sales rep",
                    };
                }
                yield queryRunner.manager.update(Leads_entity_1.Leads, { lead_id: customerId }, {
                    assigned_rep_id: repId,
                    pending_assignment: false,
                    updated_by: managerId.toString(),
                    updated_at: (0, timezone_1.getFinnishTime)(),
                });
                const updatedCustomer = yield queryRunner.manager.findOne(Leads_entity_1.Leads, {
                    where: { lead_id: customerId },
                    relations: ["address"],
                });
                yield queryRunner.commitTransaction();
                return {
                    status: http_status_codes_1.default.OK,
                    data: updatedCustomer,
                    message: "Customer assigned successfully",
                };
            }
            catch (error) {
                yield queryRunner.rollbackTransaction();
                return {
                    status: http_status_codes_1.default.INTERNAL_SERVER_ERROR,
                    message: `Failed to assign customer: ${error.message}`,
                };
            }
            finally {
                yield queryRunner.release();
            }
        });
    }
}
exports.CustomerService = CustomerService;
