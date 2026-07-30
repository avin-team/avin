export type CategoryStatus = "ACTIVE" | "HIDDEN" | "ARCHIVED";

export type ServiceInputFieldType = "text" | "url" | "file" | "number";

export interface ServiceInputField {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly type: ServiceInputFieldType;
  readonly required: boolean;
}

export interface WarrantyPolicyTemplate {
  readonly durationHours: number;
  readonly terms: string;
}

export interface WarrantyBounds {
  readonly minHours: number;
  readonly maxHours: number;
}

export interface SubCategory {
  readonly id: string;
  readonly parentId: string;
  readonly name: string;
  readonly slug: string;
  readonly commissionRatePercent: number | string;
  readonly status: CategoryStatus;
  readonly sortOrder: number;
  readonly defaultWarrantyPolicy: WarrantyPolicyTemplate;
  readonly warrantyBounds: WarrantyBounds;
  readonly defaultServiceInputs: readonly ServiceInputField[];
}

export interface ParentCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly status: CategoryStatus;
  readonly sortOrder: number;
  readonly subCategories: readonly SubCategory[];
}

export interface CreateSubCategoryInput {
  readonly parentId: string;
  readonly name: string;
  readonly slug?: string;
  readonly commissionRatePercent: number;
  readonly defaultWarrantyDurationHours: number;
  readonly defaultWarrantyTerms: string;
  readonly minWarrantyHours: number;
  readonly maxWarrantyHours: number;
}
