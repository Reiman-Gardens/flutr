import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const institutions = pgTable("institutions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  street_address: text("street_address").notNull(),
  extended_address: text("extended_address"),
  city: text("city").notNull(),
  state_province: text("state_province").notNull(),
  postal_code: text("postal_code").notNull(),
  country: text("country").notNull(),
  phone_number: text("phone_number"),
  email_address: text("email_address").unique(),
  iabes_member: text("iabes_member").notNull().default("No"),
  website_url: text("website_url"),
  logo_url: text("logo_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  institutionId: integer("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Base info on a butterfly species
export const butterfly_species = pgTable("butterfly_species", {
  id: serial("id").primaryKey(),
  scientific_name: text("scientific_name").notNull(),
  origin_country: text("origin_country").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  country: text("country").notNull(),
  website_url: text("website_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Each institution can have their own butterfly species info, initially based off of Reimen Gardens
export const butterfly_species_institution = pgTable("butterfly_species_institution", {
  id: serial("id").primaryKey(),
  butterfly_species_id: integer("butterfly_species_id")
    .notNull()
    .references(() => butterfly_species.id, { onDelete: "cascade" }),
  institution_id: integer("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  common_name: text("common_name").notNull(),
  description: text("description"),
  life_expectancy: integer("life_expectancy").notNull(),
  image_url: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  institution_id: integer("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  butterfly_species_id: integer("butterfly_species_id")
    .notNull()
    .references(() => butterfly_species.id, { onDelete: "cascade" }),
  no_records: integer("no_records").notNull(),
  supplier_id: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  shipment_date: timestamp("shipment_date").notNull(),
  arrival_date: timestamp("arrival_date").notNull(),
  emerged_in_transit: integer("emerged_in_transit"),
  damaged_in_transit: integer("damaged_in_transit"),
  diseased_in_transit: integer("diseased_in_transit"),
  parasites_in_transit: integer("parasites_in_transit"),
  non_emergence: integer("non_emergence"),
  poor_emergence: integer("poor_emergence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
