import dataSource from "../config/data-source";
import { LeadStatus } from "../enum/leadStatus";
import {
  LeadImportDto,
  AddressDto,
  UpdateLeadDto,
} from "../interfaces/common.interface";
import { Role, User } from "../models";
import { Leads } from "../models/Leads.entity";
import { Address } from "../models/Address.entity";
import httpStatusCodes from "http-status-codes";
import { AddressService } from "./address.service";
import { TerritoryService } from "./territory.service";
import { Roles } from "../enum/roles";
import { validate } from "class-validator";
import { Region } from "../models/Region.entity";
import { Subregion } from "../models/Subregion.entity";
import { TerritorySalesman } from "../models/TerritorySalesMan.entity";

const addressService = new AddressService();
const territoryService = new TerritoryService();

export class CustomerService {
  async createCustomer(
    data: LeadImportDto,
    userId: number,
    org_id: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Validate input
      const customerData = new LeadImportDto();
      Object.assign(customerData, data);
      const validationErrors = await validate(customerData);
      if (validationErrors.length) {
        const errorMsg = validationErrors
          .map((e) => Object.values(e.constraints || {}).join(", "))
          .join("; ");
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: `Validation failed: ${errorMsg}`,
        };
      }

      // Deduplication check using Address entity's unique constraint
      const existingAddress = await queryRunner.manager.findOne(Address, {
        where: {
          postal_code: data.postal_code,
          street_address: data.street_address,
          subregion: data.subregion,
          org_id: org_id,
        },
      });
      if (existingAddress) {
        const existingCustomer = await queryRunner.manager.findOne(Leads, {
          where: {
            address_id: existingAddress.address_id,
            is_active: true,
            org_id: data.org_id,
          },
        });
        if (existingCustomer) {
          await queryRunner.rollbackTransaction();
          return {
            status: httpStatusCodes.CONFLICT,
            message: `Customer with address ${data.street_address}, ${data.postal_code}, ${data.subregion} already exists`,
          };
        }
      }

      // Check for duplicate email
      const existingEmail = await queryRunner.manager.findOne(Leads, {
        where: { contact_email: data.contact_email, is_active: true },
      });
      if (existingEmail) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.CONFLICT,
          message: `Customer with email ${data.contact_email} already exists`,
        };
      }

      // Create address
      const addressData: AddressDto = {
        street_address: data.street_address,
        postal_code: data.postal_code,
        area_name: data.area_name || "",
        subregion: data.subregion,
        region: data.region,
        country: data.country || "Finland",
        org_id: org_id,
        city: data.city || "",
        state: data.state || "",
        comments: data.comments || "",
      };
      const addressResponse = await addressService.createAddress(
        addressData,
        userId
      );
      if (addressResponse.status >= 400) {
        await queryRunner.rollbackTransaction();
        return {
          status: addressResponse.status,
          message: `Failed to create address`,
        };
      }
      const address = addressResponse.data as Address;
      const territory = await territoryService.assignTerritory({
        postal_code: addressResponse.data?.postal_code,
        subregion: addressResponse.data?.subregion,
        lat: addressResponse.data?.latitude,
        lng: addressResponse.data?.longitude,
        org_id: org_id,
      });
      if (territory) {
        address.territory_id = territory.territory_id;
        address.polygon_id = territory.polygon_id || undefined;
        const updatedAddress = await queryRunner.manager.save(Address, address);
      }
      const customer = new Leads();
      customer.name = data.name;
      customer.contact_name = data.contact_name ?? "";
      customer.contact_email = data.contact_email ?? "";
      customer.contact_phone = data.contact_phone ?? "";
      customer.address_id = address.address_id;
      customer.assigned_rep_id = userId;
      customer.status = LeadStatus.Prospect;
      customer.pending_assignment = true;
      customer.is_active = true;
      customer.created_by = userId.toString();
      customer.updated_by = userId.toString();
      customer.org_id = org_id;

      const savedCustomer = await queryRunner.manager.save(Leads, customer);

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.CREATED,
        data: savedCustomer,
        message: "Customer created successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("createCustomer - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to create customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async updateCustomer(
    customerId: number,
    data: Partial<UpdateLeadDto>,
    userId: number,
    role: string
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Leads, {
        where: {
          lead_id: customerId,
          is_active: true,
          org_id: data.org_id,
        },
        relations: ["address"],
      });
      if (!customer) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found",
        };
      }
      if (role === Roles.SALES_REP && customer.assigned_rep_id !== userId) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.FORBIDDEN,
          message: "Access denied: You are not assigned to this customer",
        };
      }
      if (role === Roles.SALES_REP) {
        const allowedFields: (keyof Leads)[] = [
          "contact_name",
          "contact_email",
          "contact_phone",
          "status",
        ];
        const updates: Partial<Leads> = {};
        for (const key of allowedFields) {
          if (data[key as keyof UpdateLeadDto] !== undefined) {
            updates[key] = data[key as keyof UpdateLeadDto] as any;
          }
        }
        if (updates.status && updates.status !== LeadStatus.Active) {
          await queryRunner.rollbackTransaction();
          return {
            status: httpStatusCodes.FORBIDDEN,
            message: "Sales reps can only change status to Active",
          };
        }
        await queryRunner.manager.update(
          Leads,
          { lead_id: customerId },
          {
            ...updates,
            updated_by: userId.toString(),
            updated_at: new Date(),
          }
        );
      } else {
        let addressId = customer.address_id;
        if (
          data.street_address ||
          data.postal_code ||
          data.subregion ||
          data.region ||
          data.country ||
          data.area_name
        ) {
          const addressData: AddressDto = {
            street_address:
              data.street_address || customer.address.street_address,
            postal_code: data.postal_code || customer.address.postal_code,
            area_name: data.area_name || customer.address.area_name,
            subregion: data.subregion || customer.address.subregion,
            region: data.region || customer.address.region,
            country: data.country || customer.address.country,
            org_id: data.org_id || customer.org_id,

            city: data.city || "",
            state: data.state || "",
            comments: data.comments || "",
          };
          const addressResponse = await addressService.createAddress(
            addressData,
            userId
          );
          if (addressResponse.status >= 400 || !addressResponse.data) {
            await queryRunner.rollbackTransaction();
            return {
              status: addressResponse.status,
              message: `Failed to create address`,
            };
          }
          addressId = addressResponse.data.address_id;

          // Soft-delete old address
          await queryRunner.manager.update(
            Address,
            { address_id: customer.address_id },
            {
              is_active: false,
              updated_by: userId.toString(),
              updated_at: new Date(),
            }
          );
        }

        await queryRunner.manager.update(
          Leads,
          { lead_id: customerId },
          {
            contact_name: data.contact_name || customer.contact_name,
            contact_email: data.contact_email || customer.contact_email,
            contact_phone: data.contact_phone || customer.contact_phone,
            address_id: addressId,
            status: data.status || customer.status,
            updated_by: userId.toString(),
            updated_at: new Date(),
          }
        );
      }
      const updatedCustomer = await queryRunner.manager.findOne(Leads, {
        where: { lead_id: customerId },
        relations: ["address"],
      });

      // Auto-assign territory if address changed
      if (data.street_address || data.postal_code || data.subregion) {
        const autoAssignResult = await territoryService.autoAssignTerritory(
          updatedCustomer!.address_id,
          data.org_id || customer.org_id
        );
        if (autoAssignResult.status >= 400) {
          await queryRunner.rollbackTransaction();
          return {
            status: autoAssignResult.status,
            message: `Failed to auto-assign territory: ${autoAssignResult.message}`,
          };
        }
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: updatedCustomer,
        message: "Customer updated successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("updateCustomer - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to update customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async deleteCustomer(
    customerId: number,
    adminId: number
  ): Promise<{
    status: number;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Leads, {
        where: { lead_id: customerId, is_active: true },
      });
      if (!customer) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found",
        };
      }

      await queryRunner.manager.update(
        Leads,
        { lead_id: customerId },
        {
          is_active: false,
          updated_by: adminId.toString(),
          updated_at: new Date(),
        }
      );

      await queryRunner.manager.update(
        Address,
        { address_id: customer.address_id },
        {
          is_active: false,
          updated_by: adminId.toString(),
          updated_at: new Date(),
        }
      );

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        message: "Customer deleted successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("deleteCustomer - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to delete customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async getCustomerById(
    customerId: number,
    userId: number,
    role: string
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    try {
      const customer = await dataSource.manager.findOne(Leads, {
        where: { lead_id: customerId, is_active: true },
        relations: ["address"],
      });

      if (!customer) {
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found",
        };
      }

      if (role === Roles.SALES_REP && customer.assigned_rep_id !== userId) {
        return {
          status: httpStatusCodes.FORBIDDEN,
          message: "Access denied: You are not assigned to this customer",
        };
      }

      return {
        status: httpStatusCodes.OK,
        data: customer,
        message: "Customer retrieved successfully",
      };
    } catch (error: any) {
      console.error("getCustomerById - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve customer: ${error.message}`,
      };
    }
  }

  async getAllCustomers(
    filters: {
      territory_id?: number;
      rep_id?: number;
      status?: string;
      pending_assignment?: boolean;
      org_id?: number;
    },
    userId: number,
    role: string
  ): Promise<{
    status: number;
    data?: any[] | null;
    message: string;
  }> {
    try {
      const where: any = { is_active: true };

      if (filters.territory_id) {
        where.address = { territory_id: filters.territory_id };
      }
      if (filters.rep_id) {
        where.assigned_rep_id = filters.rep_id;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.pending_assignment !== undefined) {
        where.pending_assignment = filters.pending_assignment;
      }
      if (filters.org_id) {
        where.org_id = filters.org_id;
      }

      if (role === Roles.SALES_REP) {
        where.assigned_rep_id = userId;
      }

      const customers = await dataSource.manager.find(Leads, {
        where,
        relations: ["address"],
      });

      return {
        status: httpStatusCodes.OK,
        data: customers,
        message: "Customers retrieved successfully",
      };
    } catch (error: any) {
      console.error("getAllCustomers - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve customers: ${error.message}`,
        data: null,
      };
    }
  }

  async bulkAssignCustomers(
    customerIds: number[],
    repId: number,
    adminId: number
  ): Promise<{
    status: number;
    data?: any[];
    message: string;
    errors?: string[];
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const rep = await queryRunner.manager.findOne(User, {
        where: { user_id: repId, role: { role_name: Roles.SALES_REP } },
      });
      if (!rep) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Invalid sales rep",
        };
      }

      const updatedCustomers: Leads[] = [];
      const errors: string[] = [];

      for (const customerId of customerIds) {
        const customer = await queryRunner.manager.findOne(Leads, {
          where: { lead_id: customerId, is_active: true },
        });
        if (!customer) {
          errors.push(`Customer with ID ${customerId} not found`);
          continue;
        }

        if (!customer.pending_assignment) {
          errors.push(
            `Customer with ID ${customerId} is already assigned (${customer.name})`
          );
          continue;
        }

        await queryRunner.manager.update(
          Leads,
          { lead_id: customerId },
          {
            assigned_rep_id: repId,
            pending_assignment: false,
            updated_by: adminId.toString(),
            updated_at: new Date(),
          }
        );

        const updatedCustomer = await queryRunner.manager.findOne(Leads, {
          where: { lead_id: customerId },
          relations: ["address"],
        });
        updatedCustomers.push(updatedCustomer!);
      }

      if (errors.length && !updatedCustomers.length) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "No customers assigned",
          errors,
        };
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: updatedCustomers,
        message: "Customers assigned successfully",
        errors: errors.length ? errors : undefined,
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("bulkAssignCustomers - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to assign customers: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async importCustomers(
    data: LeadImportDto[],
    adminId: number,
    org_id: number
  ): Promise<{
    status: number;
    message: string;
    data?: { addresses: Address[]; customers: Leads[] } | null;
    errors?: string[];
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const addresses: Address[] = [];
      const customers: Leads[] = [];
      const errors: string[] = [];

      for (const row of data) {
        const addressData = new LeadImportDto();
        Object.assign(addressData, {
          ...row,
          name: row.name || undefined,
          city: row.city || "",
          region: row.region || "",
          subregion: row.subregion || "",
          org_id: org_id,
        });

        const regions = await queryRunner.manager.find(Region, {
          where: { is_active: true },
          select: ["name"],
        });
        const finnishRegions = regions.map((region) => region.name);
        if (!finnishRegions.includes(addressData.region)) {
          errors.push(
            `Invalid region for ${addressData.street_address}: ${addressData.region}`
          );
          continue;
        }

        const subregions = await queryRunner.manager.find(Subregion, {
          where: { region_name: addressData.region, is_active: true },
          select: ["name"],
        });
        const finnishSubregions = subregions.map((subregion) => subregion.name);
        if (!finnishSubregions.includes(addressData.subregion)) {
          errors.push(
            `Invalid subregion for ${addressData.street_address}: ${addressData.subregion}`
          );
          continue;
        }
        const existingAddress = await queryRunner.manager.findOne(Address, {
          where: {
            postal_code: addressData.postal_code,
            street_address: addressData.street_address,
            subregion: addressData.subregion,
            org_id: org_id,
          },
        });
        console.log("existingAddress ", existingAddress);
        if (existingAddress) {
          if (addressData.name) {
            const existingCustomer = await queryRunner.manager.findOne(Leads, {
              where: {
                address_id: existingAddress.address_id,
                is_active: true,
              },
            });
            if (existingCustomer) {
              errors.push(
                `Duplicate customer: ${addressData.name} at ${addressData.street_address}, ${addressData.postal_code}, ${addressData.subregion}`
              );
              continue;
            }
          }
          existingAddress.comments = addressData.comments || "";
          const updatedAddress = await queryRunner.manager.save(
            Address,
            existingAddress
          );
          console.log("updatedAddress ", updatedAddress);
          addresses.push(updatedAddress);
          console.log("addresses ", addresses);
        } else {
          const newAddressData: AddressDto = {
            street_address: addressData.street_address,
            postal_code: addressData.postal_code,
            area_name: addressData.area_name || "",
            subregion: addressData.subregion || "",
            region: addressData.region || "",
            country: "Finland",
            org_id: org_id,
            city: addressData.city || "",
            state: addressData.state || "",
            comments: addressData.comments || "",
          };
          console.log("newAddressData ", newAddressData);
          const addressResult = await addressService.createAddress(
            newAddressData,
            adminId
          );
          console.log("addressResult ", addressResult);
          if (addressResult.status >= 400) {
            errors.push(
              `Failed to create address for ${addressData.street_address}: ${addressResult.message}`
            );
            continue;
          }

          const address = addressResult.data as Address;
          console.log("address in else ", address);
          addresses.push(address);
        }
        // Create customer in Leads table only if name exists
        if (addressData.name) {
          const address = addresses[addresses.length - 1]; // Latest address
          const customer = new Leads();
          customer.name = addressData.name;
          customer.contact_name = addressData.contact_name || addressData.name;
          customer.contact_email = addressData.contact_email || "";
          customer.contact_phone = addressData.contact_phone || "";
          customer.address_id = address.address_id;
          customer.status = addressData.status || LeadStatus.Prospect;
          customer.pending_assignment = true;
          customer.is_active = true;
          customer.created_by = adminId.toString();
          customer.updated_by = adminId.toString();
          customer.org_id = org_id;
          customer.territory_id = address.territory_id;
          const savedCustomer = await queryRunner.manager.save(Leads, customer);
          console.log("savedCustomer ", savedCustomer);
          // Assign to sales representatives (from TerritorySalesman)
          if (address.territory_id) {
            const territorySalesmen = await queryRunner.manager.find(
              TerritorySalesman,
              {
                where: { territory_id: address.territory_id },
              }
            );
            if (territorySalesmen.length > 0) {
              // Assign to the first salesman (or implement other logic)
              customer.assigned_rep_id = territorySalesmen[0].salesman_id;
              customer.pending_assignment = false;
              await queryRunner.manager.save(Leads, customer);
            }
          }

          customers.push(savedCustomer);
        }
      }

      if (errors.length && !addresses.length) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "No addresses imported",
          errors,
        };
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: { addresses, customers },
        message: "Addresses and customers imported successfully",
        errors: errors.length ? errors : undefined,
      };
    } catch (error: any) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      console.error("importCustomers - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to import customers: ${error.message}`,
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }

  async assignCustomer(
    customerId: number,
    repId: number,
    managerId: number
  ): Promise<{
    status: number;
    message: string;
    data?: any;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Leads, {
        where: {
          lead_id: customerId,
          pending_assignment: true,
          is_active: true,
        },
      });
      if (!customer) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found or not pending assignment",
        };
      }

      const rep = await queryRunner.manager.findOne(User, {
        where: { user_id: repId, role: { role_name: Roles.SALES_REP } },
      });
      if (!rep) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "Invalid sales rep",
        };
      }

      await queryRunner.manager.update(
        Leads,
        { lead_id: customerId },
        {
          assigned_rep_id: repId,
          pending_assignment: false,
          updated_by: managerId.toString(),
          updated_at: new Date(),
        }
      );

      const updatedCustomer = await queryRunner.manager.findOne(Leads, {
        where: { lead_id: customerId },
        relations: ["address"],
      });

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: updatedCustomer,
        message: "Customer assigned successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("assignCustomer - Error:", error.message, error.stack);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to assign customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
