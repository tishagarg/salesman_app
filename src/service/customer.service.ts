import dataSource from "../config/data-source";
import { DataSource, LeadStatus } from "../enum/leadStatus";
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
import { Territory } from "../models/Territory.entity";
import { In } from "typeorm";
import { GeocodingService } from "../utils/geoCode.service";

const addressService = new AddressService();
const territoryService = new TerritoryService();
const geoCodeingService = new GeocodingService();

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
    org_id: number,
    role: string
  ): Promise<{
    status: number;
    data?: Leads | null;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Fetch customer with minimal fields
      const customer = await queryRunner.manager.findOne(Leads, {
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

      if (!customer) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found",
        };
      }

      // Check access for sales reps
      if (role === Roles.SALES_REP && customer.assigned_rep_id !== userId) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.FORBIDDEN,
          message: "Access denied: You are not assigned to this customer",
        };
      }

      let addressId = customer.address_id;
      const updateData: Partial<Leads> = {
        updated_by: userId.toString(),
        updated_at: new Date(),
      };

      if (role === Roles.SALES_REP) {
        // Sales rep: update allowed fields
        if (data.contact_name) updateData.contact_name = data.contact_name;
        if (data.contact_email) updateData.contact_email = data.contact_email;
        if (data.contact_phone) updateData.contact_phone = data.contact_phone;
        if (data.name) updateData.name = data.name;
        if (data.status) {
          if (data.status !== LeadStatus.Active) {
            await queryRunner.rollbackTransaction();
            return {
              status: httpStatusCodes.FORBIDDEN,
              message: "Sales reps can only change status to Active",
            };
          }
          updateData.status = data.status;
        }
      } else {
        // Admin: update all allowed fields
        if (data.contact_name) updateData.contact_name = data.contact_name;
        if (data.contact_email) updateData.contact_email = data.contact_email;
        if (data.contact_phone) updateData.contact_phone = data.contact_phone;
        if (data.name) updateData.name = data.name;
        if (data.status) updateData.status = data.status;

        // Handle address updates
        const hasAddressUpdate =
          data.street_address ||
          data.postal_code ||
          data.subregion ||
          data.region ||
          data.country ||
          data.area_name ||
          data.city ||
          data.state ||
          data.comments;

        if (hasAddressUpdate) {
          const address = await queryRunner.manager.findOne(Address, {
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
            ],
          });

          if (!address) {
            await queryRunner.rollbackTransaction();
            return {
              status: httpStatusCodes.NOT_FOUND,
              message: "Address not found",
            };
          }

          const addressUpdate: Partial<Address> = {
            street_address: data.street_address || address.street_address,
            postal_code: data.postal_code || address.postal_code,
            area_name: data.area_name || address.area_name,
            subregion: data.subregion || data.city || address.subregion,
            region: data.region || data.state || address.region,
            country: data.country || address.country,
            city: data.city || data.subregion || address.city,
            state: data.state || data.region || address.state,
            comments: data.comments || address.comments,
            updated_by: userId.toString(),
            updated_at: new Date(),
          };

          await queryRunner.manager.update(
            Address,
            { address_id: address.address_id },
            addressUpdate
          );
        }
      }

      if (Object.keys(updateData).length > 2) {
        await queryRunner.manager.update(
          Leads,
          { lead_id: customerId },
          updateData
        );
      }

      if (data.street_address || data.postal_code || data.subregion) {
        const autoAssignResult = await territoryService.autoAssignTerritory(
          addressId,
          org_id
        );
        if (autoAssignResult.status >= 400) {
          await queryRunner.rollbackTransaction();
          return {
            status: autoAssignResult.status,
            message: `Failed to auto-assign territory: ${autoAssignResult.message}`,
          };
        }
      }

      const updatedCustomer = await queryRunner.manager.findOne(Leads, {
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
        relationLoadStrategy: "join", // Use JOIN to fetch address in one query
      });

      if (!updatedCustomer) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Updated customer not found",
        };
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: updatedCustomer,
        message: "Customer updated successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
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
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve customer: ${error.message}`,
      };
    }
  }

  async getAllCustomers(
    filters: {
      page: number;
      limit: number;
      skip: number;
      search: string;
      source: string;
    },
    userId: number,
    role: string
  ): Promise<{
    status: number;
    data?: any[] | null;
    message: string;
    total?: number;
  }> {
    try {
      const search = filters.search?.trim().toLowerCase() || "";
      const source = filters.source?.trim().toLowerCase() || "";

      const where: any = { is_active: true };
      if (role === Roles.SALES_REP) {
        where.assigned_rep_id = userId;
      }

      const query = dataSource.manager
        .createQueryBuilder(Leads, "leads")
        .leftJoinAndSelect("leads.address", "address")
        .where("leads.is_active = :isActive", { isActive: true });
      if (role === Roles.SALES_REP) {
        query.andWhere("leads.assigned_rep_id = :userId", { userId });
      }
      if (search) {
        query.andWhere(
          `(
          LOWER(leads.name) LIKE :search OR
          LOWER(leads.contact_name) LIKE :search OR
          LOWER(leads.contact_email) LIKE :search OR
          LOWER(address.street_address) LIKE :search OR
          LOWER(address.country) LIKE :search OR
          LOWER(address.city) LIKE :search OR
          LOWER(address.postal_code) LIKE :search
        )`,
          { search: `%${search}%` }
        );
      }
      if (source) {
        query.andWhere("LOWER(leads.source) = :source", { source });
      }
      query
        .skip(filters.skip)
        .take(filters.limit)
        .orderBy("leads.created_at", "DESC");
      const [customers, total] = await query.getManyAndCount();

      return {
        status: httpStatusCodes.OK,
        data: customers,
        message: "Customers retrieved successfully",
        total,
      };
    } catch (error: any) {
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve customers: ${error.message}`,
        data: null,
        total: 0,
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
    org_id: number,
    batchSize: number = 500
  ): Promise<{
    status: number;
    message: string;
    data?: { addresses: Address[]; customers: Leads[] } | null;
    errors?: string[];
  }> {
    const queryRunner = dataSource.createQueryRunner();
    try {
      const addresses: Address[] = [];
      const customers: Leads[] = [];
      const errors: string[] = [];

      // Fetch territories once (outside transaction to reduce scope)
      const territories = await dataSource.manager.find(Territory, {
        where: { org_id, is_active: true },
        select: ["territory_id", "regions", "subregions", "postal_codes"],
      });

      // Unified lookup map for territory matching
      const territoryLookup = new Map<string, number>();
      territories.forEach((territory) => {
        const territoryId = territory.territory_id;
        try {
          if (territory.postal_codes) {
            (JSON.parse(territory.postal_codes) as string[]).forEach((code) =>
              territoryLookup.set(`postal:${code}`, territoryId)
            );
          }
          if (territory.regions) {
            (JSON.parse(territory.regions) as string[]).forEach((region) =>
              territoryLookup.set(`region:${region}`, territoryId)
            );
          }
          if (territory.subregions) {
            (JSON.parse(territory.subregions) as string[]).forEach(
              (subregion) =>
                territoryLookup.set(`subregion:${subregion}`, territoryId)
            );
          }
        } catch (e) {
          console.warn(`Malformed JSON in territory ${territoryId}: ${e}`);
        }
      });

      // Cache for geocoding results
      const geocodeCache = new Map<
        string,
        { latitude: number; longitude: number }
      >();

      // Process data in batches
      for (let i = 0; i < data.length; i += batchSize) {
        await queryRunner.startTransaction();
        try {
          const batch = data.slice(i, i + batchSize);

          // Prepare address keys for bulk lookup
          const addressKeys = batch.map((row) => ({
            postal_code: row.postal_code || "00000",
            street_address: row.street_address || "",
            subregion: row.subregion || row.city || "",
            org_id,
          }));

          // Bulk fetch existing addresses
          const existingAddresses = await queryRunner.manager.find(Address, {
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
          });
          const addressMap = new Map<string, Address>(
            existingAddresses.map((addr) => [
              `${addr.postal_code}|${addr.street_address}|${addr.subregion}|${org_id}`,
              addr,
            ])
          );

          const addressIds = existingAddresses.map((addr) => addr.address_id);
          const existingLeads = addressIds.length
            ? await queryRunner.manager.find(Leads, {
                where: { address_id: In(addressIds), is_active: true },
                select: ["address_id"],
              })
            : [];
          const leadAddressIds = new Set(
            existingLeads.map((lead) => lead.address_id)
          );

          const newAddresses: Address[] = [];
          const addressesToUpdate: Address[] = [];
          const newCustomers: Leads[] = [];
          const customerToAddressIndex: Map<number, number> = new Map();

          const addressesToGeocode: {
            index: number;
            address: {
              street_address: string;
              postal_code: string;
              subregion: string;
              city: string;
              state: string;
              region: string;
              country: string;
            };
          }[] = [];

          batch.forEach((row, index) => {
            const addressData = {
              name: row.name || "",
              contact_name: row.contact_name || "",
              contact_email: row.contact_email || "",
              contact_phone: row.contact_phone || "",
              street_address: row.street_address || "",
              comments: row.comments || "",
              postal_code: row.postal_code || "00000",
              area_name: row.area_name || "",
              city: row.city || "",
              state: row.state || "",
              subregion: row.subregion || row.city || "",
              region: row.region || row.state || "",
              country: row.country || "Finland",
            };

            const territoryId =
              territoryLookup.get(`postal:${addressData.postal_code}`) ||
              territoryLookup.get(`region:${addressData.region}`) ||
              territoryLookup.get(`subregion:${addressData.subregion}`) ||
              null;

            const addressKey = `${addressData.postal_code}|${addressData.street_address}|${addressData.subregion}|${org_id}`;
            const existingAddress = addressMap.get(addressKey);

            let address: Address;
            if (existingAddress) {
              if (
                addressData.name &&
                leadAddressIds.has(existingAddress.address_id)
              ) {
                errors.push(
                  `Duplicate customer: ${addressData.name} at ${addressData.street_address}, ${addressData.postal_code}, ${addressData.subregion}`
                );
                return;
              }
              existingAddress.comments =
                addressData.comments || existingAddress.comments;
              existingAddress.territory_id =
                territoryId || existingAddress.territory_id;
              addressesToUpdate.push(existingAddress);
              address = existingAddress;
            } else {
              const newAddress: Address = queryRunner.manager.create(Address, {
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
                latitude: 0, // Will be set after geocoding
                longitude: 0,
                created_by: adminId.toString(),
                updated_by: adminId.toString(),
                is_active: true,
              });
              newAddresses.push(newAddress);
              addressesToGeocode.push({
                index: newAddresses.length - 1,
                address: {
                  street_address: addressData.street_address,
                  postal_code: addressData.postal_code,
                  subregion: addressData.subregion,
                  city: addressData.city,
                  state: addressData.state,
                  region: addressData.region,
                  country: addressData.country,
                },
              });
              address = newAddress;
            }
            addresses.push(address);

            if (addressData.name) {
              const customer = queryRunner.manager.create(Leads, {
                name: addressData.name,
                contact_name: addressData.contact_name || addressData.name,
                contact_email: addressData.contact_email,
                contact_phone: addressData.contact_phone,
                pending_assignment: true,
                is_active: true,
                created_by: adminId.toString(),
                updated_by: adminId.toString(),
                org_id,
                source: DataSource.Excel,
                territory_id: territoryId,
              });
              newCustomers.push(customer);
              customerToAddressIndex.set(
                newCustomers.length - 1,
                newAddresses.length - 1
              );
            }
          });

          if (addressesToGeocode.length) {
            const geocodePromises = addressesToGeocode.map(
              async ({ index, address }) => {
                const cacheKey = `${address.street_address}|${address.postal_code}|${address.subregion}|${address.country}`;
                if (geocodeCache.has(cacheKey)) {
                  return { index, coords: geocodeCache.get(cacheKey)! };
                }
                try {
                  const coords = await geoCodeingService.getCoordinates(
                    address
                  );
                  geocodeCache.set(cacheKey, coords);
                  return { index, coords };
                } catch (e) {
                  errors.push(`Geocoding failed for address: ${cacheKey}`);
                  return { index, coords: { latitude: 0, longitude: 0 } };
                }
              }
            );

            const geocodeResults = await Promise.all(geocodePromises);
            geocodeResults.forEach(({ index, coords }) => {
              newAddresses[index].latitude = coords.latitude;
              newAddresses[index].longitude = coords.longitude;
            });
          }

          // Bulk insert new addresses
          if (newAddresses.length) {
            const savedAddresses = await queryRunner.manager.save(
              Address,
              newAddresses
            );
            newCustomers.forEach((customer, customerIndex) => {
              const addressIndex = customerToAddressIndex.get(customerIndex);
              if (addressIndex !== undefined && savedAddresses[addressIndex]) {
                customer.address_id = savedAddresses[addressIndex].address_id;
              }
            });
            addresses.splice(
              addresses.length - newAddresses.length,
              newAddresses.length,
              ...savedAddresses
            );
          }

          if (addressesToUpdate.length) {
            await queryRunner.manager.save(Address, addressesToUpdate);
          }

          const territoryIds = [
            ...new Set(
              newCustomers.map((c) => c.territory_id).filter((id) => id)
            ),
          ];
          const territorySalesmen = territoryIds.length
            ? await queryRunner.manager.find(TerritorySalesman, {
                where: { territory_id: In(territoryIds) },
                select: ["territory_id", "salesman_id"],
              })
            : [];
          const salesmanMap = new Map<number, number>(
            territorySalesmen.map((ts) => [ts.territory_id, ts.salesman_id])
          );
          newCustomers.forEach((customer) => {
            if (
              customer.territory_id &&
              salesmanMap.has(customer.territory_id)
            ) {
              customer.assigned_rep_id = salesmanMap.get(
                customer.territory_id
              )!;
              customer.pending_assignment = false;
            }
          });

          // Bulk insert new customers
          if (newCustomers.length) {
            const savedCustomers = await queryRunner.manager.save(
              Leads,
              newCustomers
            );
            customers.push(...savedCustomers);
          }

          await queryRunner.commitTransaction();
        } catch (batchError: any) {
          await queryRunner.rollbackTransaction();
          errors.push(
            `Batch ${i / batchSize + 1} failed: ${batchError.message}`
          );
        }
      }

      if (errors.length && !addresses.length) {
        return {
          status: httpStatusCodes.BAD_REQUEST,
          message: "No addresses imported",
          errors,
        };
      }

      return {
        status: httpStatusCodes.OK,
        data: { addresses, customers },
        message: "Addresses and customers imported successfully",
        errors: errors.length ? errors : undefined,
      };
    } catch (error: any) {
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
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to assign customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
