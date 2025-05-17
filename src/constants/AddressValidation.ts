import { IsNotEmpty } from "class-validator";
export class AddressValidation {
  @IsNotEmpty()
  street_address: string;

  @IsNotEmpty()
  postal_code: string;

  @IsNotEmpty()
  city: string;

  @IsNotEmpty()
  state: string;

  @IsNotEmpty()
  country: string;
}
