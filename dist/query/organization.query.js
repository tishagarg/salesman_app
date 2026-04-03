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
exports.OrganizationQuery = void 0;
const Organisation_entity_1 = require("../models/Organisation.entity");
const User_entity_1 = require("../models/User.entity");
const timezone_1 = require("../utils/timezone");
class OrganizationQuery {
    // Method to save a new organization
    saveOrganization(manager, org_name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!org_name) {
                org_name = "";
            }
            const organization = manager
                .getRepository(Organisation_entity_1.Organization)
                .create({ org_name });
            const dbResponse = yield manager
                .getRepository(Organisation_entity_1.Organization)
                .save(organization);
            return dbResponse;
        });
    }
    // Method to update an existing organization
    updateOrganization(manager, org_id, // The organization ID to update
    updateData // The data you want to update
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            const organizationRepo = manager.getRepository(Organisation_entity_1.Organization);
            // Update the organization record
            yield organizationRepo.update(org_id, Object.assign(Object.assign({}, updateData), { updated_at: (0, timezone_1.getFinnishTime)() }));
            // Fetch the updated organization
            const updatedOrganization = yield organizationRepo.findOne({
                where: { org_id },
            });
            return updatedOrganization;
        });
    }
    getUserByIdWithOrganization(manager, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield manager
                .createQueryBuilder()
                .select("*")
                .from(User_entity_1.User, "user")
                .leftJoin(Organisation_entity_1.Organization, "organization", "user.org_id = organization.org_id")
                .where("user.user_id = :userId", { userId })
                .getRawOne();
            if (!result)
                return null;
            return result;
        });
    }
    getOrganizationById(manager, org_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const organizationRepo = manager.getRepository(Organisation_entity_1.Organization);
            // Fetch the organization by ID
            const organization = yield organizationRepo.findOne({
                where: { org_id },
            });
            return organization;
        });
    }
    getOrganizationByOwnerId(manager, owner_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const organizationRepo = manager.getRepository(Organisation_entity_1.Organization);
            // Fetch the organization by owner ID
            const organization = yield organizationRepo.findOne({
                where: { owner_id },
            });
            return organization;
        });
    }
}
exports.OrganizationQuery = OrganizationQuery;
