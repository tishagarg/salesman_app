import { IsNumber } from "class-validator";
import { LeadStatus } from "../enum/leadStatus";

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

export interface ILeadImport {
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

export class LeadImportDto {
  name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  street_address: string;
  comments?: string;
  postal_code: string;
  area_name?: string;
  city?: string;
  state?: string;
  subregion: string;
  region: string;
  country?: string;
  org_id: number;
  status?: LeadStatus;
}
export class UpdateLeadDto {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  street_address?: string;
  comments?: string;
  postal_code?: string;
  name?: string;
  address?: AddressDto;
  org_id: number;
  status?: LeadStatus;
}
export class Coordinates {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
export class TerritoryDto {
  name: string;

  postal_codes?: string[];

  subregions?: string[];

  regions?: string[];

  polygon_id?: number;

  manager_id?: number;

  sales_rep_id?: number[];

  org_id: number;

  is_active?: boolean;

  geometry?: Coordinates[];

  salesmanIds?: string[];
}

export class AddressDto {
  street_address: string;
  building_unit?: string;
  landmark?: string;
  comments?: string;
  postal_code: string;
  area_name: string;
  subregion: string;
  city: string;
  state: string;
  region: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  territory_id?: number | null;
  polygon_id?: number;
  org_id: number;
}

export class PolygonDto {
  name: string;
  geometry: { type: string; coordinates: number[][][] };
  org_id: number;
  territory_id?: number;
}
