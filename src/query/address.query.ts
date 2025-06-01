import { EntityManager } from "typeorm";
import { Address } from "../models/Address.entity";
import { AddressDto } from "../interfaces/common.interface";

export class AddressQuery {
  async updateAddress(
    manager: EntityManager,
    address_id: number,
    addressData: Partial<Address>,
    org_id: number
  ): Promise<Address | null> {
    const addressRepo = manager.getRepository(Address);
    const existingAddress = await addressRepo.findOne({
      where: { address_id, org_id },
    });
    if (!existingAddress) {
      return null;
    }
    await addressRepo.update(address_id, {
      ...addressData,
      updated_at: new Date(),
    });
    const updatedAddress = await addressRepo.findOne({
      where: { address_id },
    });
    return updatedAddress;
  }

  async getAddressById(
    manager: EntityManager,
    address_id: number
  ): Promise<Address | null> {
    const addressRepo = manager.getRepository(Address);
    const address = await addressRepo.findOne({
      where: { address_id },
    });

    return address;
  }
  async createAddress(
    manager: EntityManager,
    addressData: Partial<AddressDto>,
    org_id: number
  ): Promise<Address> {
    const addressRepo = manager.getRepository(Address);
    const newAddress = addressRepo.create({
      ...addressData,
      org_id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return await addressRepo.save(newAddress);
  }
}
