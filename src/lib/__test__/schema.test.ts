import { getTableName } from "drizzle-orm";
import {
  institutions,
  users,
  butterfly_species,
  suppliers,
  butterfly_species_institution,
  shipments,
} from "@/lib/schema";

describe("schema", () => {
  describe("table names", () => {
    it("defines all expected tables", () => {
      expect(getTableName(institutions)).toBe("institutions");
      expect(getTableName(users)).toBe("users");
      expect(getTableName(butterfly_species)).toBe("butterfly_species");
      expect(getTableName(suppliers)).toBe("suppliers");
      expect(getTableName(butterfly_species_institution)).toBe("butterfly_species_institution");
      expect(getTableName(shipments)).toBe("shipments");
    });
  });

  describe("institutions", () => {
    it("has required columns", () => {
      const columns = Object.keys(institutions);
      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("street_address");
      expect(columns).toContain("city");
      expect(columns).toContain("state_province");
      expect(columns).toContain("postal_code");
      expect(columns).toContain("country");
      expect(columns).toContain("createdAt");
      expect(columns).toContain("updatedAt");
    });

    it("has optional columns", () => {
      const columns = Object.keys(institutions);
      expect(columns).toContain("extended_address");
      expect(columns).toContain("phone_number");
      expect(columns).toContain("email_address");
      expect(columns).toContain("website_url");
      expect(columns).toContain("logo_url");
      expect(columns).toContain("description");
    });
  });

  describe("users", () => {
    it("has required columns", () => {
      const columns = Object.keys(users);
      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("email");
      expect(columns).toContain("password_hash");
      expect(columns).toContain("institutionId");
      expect(columns).toContain("role");
    });
  });

  describe("butterfly_species", () => {
    it("has required columns", () => {
      const columns = Object.keys(butterfly_species);
      expect(columns).toContain("id");
      expect(columns).toContain("scientific_name");
      expect(columns).toContain("origin_country");
    });
  });

  describe("suppliers", () => {
    it("has required columns", () => {
      const columns = Object.keys(suppliers);
      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("code");
      expect(columns).toContain("country");
      expect(columns).toContain("website_url");
    });
  });

  describe("butterfly_species_institution", () => {
    it("has required columns", () => {
      const columns = Object.keys(butterfly_species_institution);
      expect(columns).toContain("id");
      expect(columns).toContain("butterfly_species_id");
      expect(columns).toContain("institution_id");
      expect(columns).toContain("common_name");
      expect(columns).toContain("life_expectancy");
    });
  });

  describe("shipments", () => {
    it("has required columns", () => {
      const columns = Object.keys(shipments);
      expect(columns).toContain("id");
      expect(columns).toContain("institution_id");
      expect(columns).toContain("butterfly_species_id");
      expect(columns).toContain("no_records");
      expect(columns).toContain("supplier_id");
      expect(columns).toContain("shipment_date");
      expect(columns).toContain("arrival_date");
    });

    it("has transit tracking columns", () => {
      const columns = Object.keys(shipments);
      expect(columns).toContain("emerged_in_transit");
      expect(columns).toContain("damaged_in_transit");
      expect(columns).toContain("diseased_in_transit");
      expect(columns).toContain("parasites_in_transit");
      expect(columns).toContain("non_emergence");
      expect(columns).toContain("poor_emergence");
    });
  });
});
