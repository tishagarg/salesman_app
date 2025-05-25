import {
  IS_OPTIONAL,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from "class-validator";
import { CustomerStatus } from "../enum/customerStatus";

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
  name: string;
  contact_name?: string;
  contact_email: string;
  contact_phone?: string;
  street_address: string;
  postal_code: string;
  area_name?: string;
  subregion: string;
  region: string;
  country?: string;
  org_id: number;
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}
export class UpdateCustomerDto {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  street_address?: string;
  postal_code?: string;
  area_name?: string;
  subregion?: string;
  region?: string;
  org_id: number;

  country?: string;
  status?: CustomerStatus;
}

export class TerritoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  postal_codes?: string[];

  @IsOptional()
  @IsArray()
  subregions?: string[];

  @IsOptional()
  @IsString()
  polygon_id?: number;

  @IsOptional()
  @IsInt()
  manager_id?: number;

  @IsOptional()
  @IsInt()
  sales_rep_id?: number;

  @IsInt()
  org_id: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class AddressDto {
  @IsString()
  street_address: string;

  @IsOptional()
  @IsString()
  building_unit?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsString()
  postal_code: string;

  @IsString()
  area_name: string;

  @IsString()
  subregion: string;

  @IsString()
  region: string;

  @IsOptional()
  @IsString()
  country?: string;
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsInt()
  territory_id?: number;

  @IsOptional()
  @IsString()
  polygon_id?: number;

  @IsInt()
  org_id: number;
}

export class PolygonDto {
  @IsString()
  name: string;

  geometry: { type: string; coordinates: number[][][] };

  @IsInt()
  org_id: number;

  @IsOptional()
  @IsInt()
  territory_id?: number;
}
