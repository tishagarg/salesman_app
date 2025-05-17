import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from "class-validator";

export interface IDeleteById {
  id: string;
}

export interface IDetailById {
  id: string;
}

export interface IBaseQueryParams {
  limit: number;
  page: number;
}

export interface IOverrideRequest {
  code: number;
  message: string;
  positive: string;
  negative: string;
}

export interface ICookie {
  key: string;
  value: string;
}

export interface IPagination {
  totalPages: number;
  previousPage: number | null;
  currentPage: number;
  nextPage: number | null;
  totalItems: number;
}
export interface IMail {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: IAttachment[];
}

export interface IAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface ICustomerImport {
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  street_address: string;
  postal_code: string;
  city: string;
  state: string;
  country: string;
}

export class CustomerImportDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  contact_phone?: string;

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

export class TerritoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  postal_codes: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subregions: string[];
}
