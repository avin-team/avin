import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { user } from "./auth";
import { sellerProfile } from "./seller";

export const serviceInputFieldTypeSchema = z.enum([
  "text",
  "url",
  "file",
  "number",
]);

export type ServiceInputFieldType = z.infer<typeof serviceInputFieldTypeSchema>;

export const serviceInputFieldSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  required: z.boolean(),
  type: serviceInputFieldTypeSchema,
});

export type ServiceInputField = z.infer<typeof serviceInputFieldSchema>;

export const warrantyPolicySchema = z.discriminatedUnion("kind", [
  z.object({
    durationHours: z.number().int().positive(),
    kind: z.literal("TIMED"),
    terms: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("NO_WARRANTY"),
  }),
]);

export type WarrantyPolicy = z.infer<typeof warrantyPolicySchema>;

export const servicePackageDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  priceAmount: z.number().int().positive(),
  processingTimeHours: z.number().int().positive(),
  scope: z.string().trim().min(1).max(10_000),
  serviceInputFields: z.array(serviceInputFieldSchema).default([]),
  warrantyPolicy: warrantyPolicySchema,
});

export type ServicePackageDraft = z.infer<typeof servicePackageDraftSchema>;

export const categoryStatus = pgEnum("category_status", [
  "ACTIVE",
  "HIDDEN",
  "ARCHIVED",
]);

export const listingType = pgEnum("listing_type", ["SERVICE", "COURSE"]);

export const listingStatus = pgEnum("listing_status", [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "HIDDEN",
  "ARCHIVED",
]);

export const servicePackageStatus = pgEnum("service_package_status", [
  "AVAILABLE",
  "UNAVAILABLE",
]);

export const parentCategory = pgTable(
  "parent_category",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: categoryStatus("status").default("ACTIVE").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("parent_category_slug_idx").on(table.slug),
    index("parent_category_status_idx").on(table.status),
    index("parent_category_sort_order_idx").on(table.sortOrder),
  ]
);

export const subCategory = pgTable(
  "sub_category",
  {
    commissionRatePercent: numeric("commission_rate_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    defaultServiceInputs: jsonb("default_service_inputs")
      .$type<ServiceInputField[]>()
      .default([])
      .notNull(),
    defaultWarrantyPolicy: jsonb("default_warranty_policy")
      .$type<{
        durationHours: number;
        terms: string;
      }>()
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parentCategory.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: categoryStatus("status").default("ACTIVE").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    warrantyBounds: jsonb("warranty_bounds")
      .$type<{
        minHours: number;
        maxHours: number;
      }>()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sub_category_parent_slug_unique_idx").on(
      table.parentId,
      table.slug
    ),
    index("sub_category_parent_id_idx").on(table.parentId),
    index("sub_category_status_idx").on(table.status),
    index("sub_category_sort_order_idx").on(table.sortOrder),
  ]
);

export const listing = pgTable(
  "listing",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => subCategory.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    id: uuid("id").defaultRandom().primaryKey(),
    // price in VND
    images: jsonb("images").$type<string[]>().default([]).notNull(),
    priceAmount: integer("price_amount"),
    processingTimeHours: integer("processing_time_hours"),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serviceInputFields: jsonb("service_input_fields")
      .$type<ServiceInputField[]>()
      .default([])
      .notNull(),
    slug: text("slug").notNull().unique(),
    status: listingStatus("status").default("DRAFT").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    title: text("title"),
    type: listingType("type").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    warrantyDurationHours: integer("warranty_duration_hours"),
    warrantyTerms: text("warranty_terms"),
  },
  (table) => [
    index("listing_category_id_idx").on(table.categoryId),
    index("listing_seller_id_idx").on(table.sellerId),
    index("listing_slug_idx").on(table.slug),
    index("listing_status_idx").on(table.status),
    index("listing_price_amount_idx").on(table.priceAmount),
    index("listing_created_at_idx").on(table.createdAt),
  ]
);

export const servicePackage = pgTable(
  "service_package",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    firstPublishedAt: timestamp("first_published_at"),
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceAmount: integer("price_amount").notNull(),
    processingTimeHours: integer("processing_time_hours").notNull(),
    scope: text("scope").notNull(),
    serviceInputFields: jsonb("service_input_fields")
      .$type<ServiceInputField[]>()
      .default([])
      .notNull(),
    status: servicePackageStatus("status").default("AVAILABLE").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    warrantyPolicy: jsonb("warranty_policy").$type<WarrantyPolicy>().notNull(),
  },
  (table) => [
    uniqueIndex("service_package_listing_name_unique_idx").on(
      table.listingId,
      table.name
    ),
    index("service_package_listing_id_idx").on(table.listingId),
    index("service_package_listing_status_idx").on(
      table.listingId,
      table.status
    ),
    index("service_package_price_amount_idx").on(table.priceAmount),
  ]
);

export const parentCategoryRelations = relations(
  parentCategory,
  ({ many }) => ({
    subCategories: many(subCategory),
  })
);

export const subCategoryRelations = relations(subCategory, ({ one, many }) => ({
  listings: many(listing),
  parentCategory: one(parentCategory, {
    fields: [subCategory.parentId],
    references: [parentCategory.id],
  }),
}));

export const listingRelations = relations(listing, ({ many, one }) => ({
  category: one(subCategory, {
    fields: [listing.categoryId],
    references: [subCategory.id],
  }),
  seller: one(user, {
    fields: [listing.sellerId],
    references: [user.id],
  }),
  sellerProfile: one(sellerProfile, {
    fields: [listing.sellerId],
    references: [sellerProfile.userId],
  }),
  servicePackages: many(servicePackage),
}));

export const servicePackageRelations = relations(servicePackage, ({ one }) => ({
  listing: one(listing, {
    fields: [servicePackage.listingId],
    references: [listing.id],
  }),
}));
