import { Page } from "puppeteer";
export interface RawCategory {
  Id: string;
  Name: string;
  ParentCategoryId: string | null;
}

export interface RawProduct {
  Id: string;
  Categories?: RawCategory[];
  [key: string]: unknown;
}

export interface DepartmentGroup {
  Id: string;
  Count: number;
  Products: RawProduct[];
}

export interface ApiResponse {
  HasErrors: boolean;
  HasNoErrors: boolean;
  next_interval?: number;
  Meta?: {
    Pagination: {
      Skip: number;
      Take: number;
      TotalNumberOfRecords: number;
    };
  };
  Result?: DepartmentGroup[] | { Products: RawProduct[] };
}

export interface RequestBody {
  itemsPerAggregation: number;
  categoryIds?: string[];
}

export interface InterceptedRequestData {
  initialProducts: RawProduct[];
  headers: Record<string, string>;
  method: string;
  requestBody?: string;
}

export interface InterceptedRequest {
  page: Page;
  data: InterceptedRequestData;
}