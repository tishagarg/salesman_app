import dataSource from "../config/data-source";
import { CustomerStatus } from "../enum/customerStatus";
import {
  CustomerImportDto,
  ICustomerImport,
} from "../interfaces/common.interface";
import { User } from "../models";
import { Customer } from "../models/Customer.entity";
import httpStatusCodes from "http-status-codes";
import { AddressService } from "./address.service";
import { Address } from "../models/Address.entity";
const addressService = new AddressService();

export class CustomerService {
  async createCustomer(
    data: CustomerImportDto,
    adminId: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      // Deduplication check
      const existing = await queryRunner.manager.findOne(Customer, {
        where: [
          { name: data.name, address: { postal_code: data.postal_code } },
          { contact_email: data.contact_email },
        ],
        relations: ["address"],
      });
      if (existing) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.CONFLICT,
          message: `Customer with name ${data.name} at ${data.postal_code} or email ${data.contact_email} already exists`,
        };
      }

      // Create address with geolocation
      const addressData = {
        street_address: data.street_address,
        postal_code: data.postal_code,
        city: data.city,
        state: data.state,
        country: data.country,
        created_by: adminId.toString(),
      };
      const addressResponse = await addressService.createAddress(addressData);
      if (addressResponse.status >= 400) {
        await queryRunner.rollbackTransaction();
        return {
          status: addressResponse.status,
          message: `Failed to create address: ${addressResponse.message}`,
        };
      }
      const address = addressResponse.data as Address;

      // Create customer
      const customer = await queryRunner.manager.save(Customer, {
        name: data.name,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        address_id: address.address_id,
        status: CustomerStatus.Prospect,
        pending_assignment: true,
        is_active: true,
        created_by: adminId.toString(),
        created_at: new Date(),
        updated_by: adminId.toString(),
        updated_at: new Date(),
      });

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.CREATED,
        data: customer,
        message: "Customer created successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("createCustomer - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to create customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Update a customer
  async updateCustomer(
    customerId: string,
    data: Partial<CustomerImportDto>,
    adminId: number
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: parseInt(customerId), is_active: true },
        relations: ["address"],
      });
      if (!customer) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found",
        };
      }

      // Update address if provided
      let addressId = customer.address_id;
      if (
        data.street_address ||
        data.postal_code ||
        data.city ||
        data.state ||
        data.country
      ) {
        const addressData = {
          street_address:
            data.street_address || customer.address.street_address,
          postal_code: data.postal_code || customer.address.postal_code,
          city: data.city || customer.address.city,
          state: data.state || customer.address.state,
          country: data.country || customer.address.country,
          created_by: adminId.toString(),
        };
        const addressResponse = await addressService.createAddress(
          addressData,
        );
        if (!addressResponse) {
          await queryRunner.rollbackTransaction();
          return {
            status: 400,
            message: `Failed to update address`,
          };
        }
        if (addressResponse && addressResponse.data && addressResponse.data.address_id) {
          addressId = addressResponse.data.address_id;
        } else {
          await queryRunner.rollbackTransaction();
          return {
            status: 400,
            message: `Failed to update address: Invalid address response`,
          };
        }

        // Soft-delete old address
        await queryRunner.manager.update(
          Address,
          { address_id: customer.address_id },
          {
            is_active: false,
            updated_by: adminId.toString(),
            updated_at: new Date(),
          }
        );
      }

      // Update customer
      await queryRunner.manager.update(
        Customer,
        { customer_id: parseInt(customerId) },
        {
          name: data.name || customer.name,
          contact_name: data.contact_name || customer.contact_name,
          contact_email: data.contact_email || customer.contact_email,
          contact_phone: data.contact_phone || customer.contact_phone,
          address_id: addressId,
          updated_by: adminId.toString(),
          updated_at: new Date(),
        }
      );

      const updatedCustomer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: parseInt(customerId) },
        relations: ["address"],
      });

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: updatedCustomer,
        message: "Customer updated successfully",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("updateCustomer - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to update customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Delete a customer (soft delete)
  async deleteCustomer(
    customerId: string,
    adminId: number
  ): Promise<{
    status: number;
    message: string;
  }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: parseInt(customerId), is_active: true },
      });
      if (!customer) {
        await queryRunner.rollbackTransaction();
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found",
        };
      }

      await queryRunner.manager.update(
        Customer,
        { customer_id: parseInt(customerId) },
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
      console.error("deleteCustomer - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to delete customer: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // Get a customer by ID
  async getCustomerById(
    customerId: string,
    userId: number,
    role: string
  ): Promise<{
    status: number;
    data?: any;
    message: string;
  }> {
    try {
      const customer = await dataSource.manager.findOne(Customer, {
        where: { customer_id: parseInt(customerId), is_active: true },
        relations: ["address"],
      });

      if (!customer) {
        return {
          status: httpStatusCodes.NOT_FOUND,
          message: "Customer not found",
        };
      }

      // Role-based access: Sales reps can only see their assigned customers
      if (role === "SalesRep" && customer.assigned_rep_id !== userId) {
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
      console.error("getCustomerById - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve customer: ${error.message}`,
      };
    }
  }

  // Get all customers with filters
  async getAllCustomers(
    filters: {
      territory_id?: number;
      rep_id?: number;
      status?: string;
      pending_assignment?: boolean;
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
        where.rep_id = filters.rep_id;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.pending_assignment !== undefined) {
        where.pending_assignment = filters.pending_assignment;
      }

      // Role-based access: Sales reps only see their assigned customers
      if (role === "SalesRep") {
        where.rep_id = userId;
      }

      const customers = await dataSource.manager.find(Customer, {
        where,
        relations: ["address"],
      });

      return {
        status: httpStatusCodes.OK,
        data: customers,
        message: "Customers retrieved successfully",
      };
    } catch (error: any) {
      console.error("getAllCustomers - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to retrieve customers: ${error.message}`,
        data:null
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
      const updatedCustomers: Customer[] = [];
      const errors: string[] = [];

      for (const customerId of customerIds) {
        const customer = await queryRunner.manager.findOne(Customer, {
          where: { customer_id: customerId, is_active: true },
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
          Customer,
          { customer_id: customerId },
          {
            assigned_rep_id: repId,
            pending_assignment: false,
            updated_by: adminId.toString(),
            updated_at: new Date(),
          }
        );

        const updatedCustomer = await queryRunner.manager.findOne(Customer, {
          where: { customer_id: customerId },
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
      console.error("bulkAssignCustomers - Error:", error.message);
      return {
        status: httpStatusCodes.INTERNAL_SERVER_ERROR,
        message: `Failed to assign customers: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }
  async importCustomers(
    fileData: CustomerImportDto[],
    adminId: number
  ): Promise<{ status: number; message: string; data: any }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const addressService = new AddressService();
      const customers: Customer[] = [];
      const errors: string[] = [];

      for (const row of fileData) {
        console.log(row);
        // Deduplication check by name + postal_code or contact_email
        const existing = await queryRunner.manager.findOne(Customer, {
          where: [
            { name: row.name, address: { postal_code: row.postal_code } },
            { contact_email: row.contact_email },
          ],
        });
        console.log("existing ", existing);
        if (existing) {
          errors.push(
            `Duplicate customer: ${row.name} at ${row.postal_code} or ${row.contact_email}`
          );
          continue;
        }

        // Create address
        const addressResult = await addressService.createAddress({
          street_address: row.street_address,
          postal_code: row.postal_code,
          city: row.city,
          state: row.state,
          country: row.country,
          created_by: adminId.toString(),
        });
        console.log(addressResult);

        // Check if address creation failed
        if ("status" in addressResult && "message" in addressResult) {
          errors.push(
            `Failed to create address for ${row.name}: ${addressResult.message}`
          );
          continue;
        }

        const address = addressResult as Address;

        // Create customer with pending_assignment
        const customer = await queryRunner.manager.save(Customer, {
          name: row.name,
          contact_name: row.contact_name,
          contact_email: row.contact_email,
          contact_phone: row.contact_phone,
          address_id: address.address_id,
          status: CustomerStatus.Prospect,
          pending_assignment: true,
          is_active: true,
          created_by: adminId.toString(),
        });

        customers.push(customer);
      }

      await queryRunner.commitTransaction();
      return {
        status: httpStatusCodes.OK,
        data: customers,
        message:
          customers.length > 0
            ? "Customers imported successfully"
            : "No customers imported",
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      return {
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }

  // async updateCustomer(
  //   customerId: string,
  //   data: Partial<Customer>,
  //   repId: number
  // ): Promise<{ status: number; message: string; data: any }> {
  //   const queryRunner = dataSource.createQueryRunner();
  //   await queryRunner.startTransaction();
  //   try {
  //     const customer = await queryRunner.manager.findOne(Customer, {
  //       where: { customer_id: parseInt(customerId), assigned_rep_id: repId },
  //     });
  //     if (!customer) {
  //       throw new Error("Customer not found or not assigned to rep");
  //     }
  //     // Define allowed fields as keyof Customer
  //     const allowedFields: (keyof Customer)[] = [
  //       "name",
  //       "contact_name",
  //       "contact_email",
  //       "contact_phone",
  //       "status",
  //       "address_id",
  //     ];
  //     const updates: Partial<Customer> = {};
  //     for (const key of allowedFields) {
  //       if (data[key] !== undefined) {
  //         updates[key] = data[key] as any;
  //       }
  //     }
  //     // Reps can only change status to Active (Workflow 3.4)
  //     if (updates.status && updates.status !== CustomerStatus.Active) {
  //       throw new Error("Reps can only change status to Active");
  //     }
  //     await queryRunner.manager.update(Customer, customerId, {
  //       ...updates,
  //       updated_by: repId.toString(),
  //     });
  //     const updatedCustomer = await queryRunner.manager.findOne(Customer, {
  //       where: { customer_id: parseInt(customerId) },
  //     });
  //     await queryRunner.commitTransaction();
  //     return {
  //       status: httpStatusCodes.OK,
  //       data: updatedCustomer,
  //       message: "Customer updated successfully",
  //     };
  //   } catch (error: any) {
  //     await queryRunner.rollbackTransaction();
  //     return {
  //       status: httpStatusCodes.BAD_REQUEST,
  //       message: error.message,
  //       data: null,
  //     };
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  async assignCustomer(
    customerId: string,
    repId: number,
    managerId: number
  ): Promise<{ status: number; message: string; data: any }> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const customer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: parseInt(customerId), pending_assignment: true },
      });
      if (!customer) {
        throw new Error("Customer not found or not pending assignment");
      }
      const rep = await queryRunner.manager.findOne(User, {
        where: { user_id: repId, role: { role_name: "sales rep" } },
      });
      if (!rep) {
        throw new Error("Invalid sales rep");
      }
      await queryRunner.manager.update(Customer, customerId, {
        assigned_rep_id: repId,
        pending_assignment: false,
        updated_by: managerId.toString(),
      });
      const updatedCustomer = await queryRunner.manager.findOne(Customer, {
        where: { customer_id: parseInt(customerId) },
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
        status: httpStatusCodes.BAD_REQUEST,
        message: error.message,
        data: null,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
