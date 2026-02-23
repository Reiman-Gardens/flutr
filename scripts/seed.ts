import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import {
  institutions,
  institution_news,
  butterfly_species,
  butterfly_species_institution,
  shipments,
  shipment_items,
  suppliers,
  users,
} from "@/lib/schema";
import usersData from "./data/users.json";
import shipmentsData from "./data/shipments.json";
import suppliersData from "./data/suppliers.json";
import masterSpeciesData from "./data/master_butterfly_list.json";
import newsData from "./data/institution_news.json";
import institutionData from "./data/institution.json";

type MasterSpeciesRecord = (typeof masterSpeciesData)[number];

async function main() {
  console.log("Starting seed...");

  // 1. Safety check — ensure DB is empty
  const existingInstitutions = await db.select().from(institutions);
  if (existingInstitutions.length > 0) {
    throw new Error(
      "Database is not empty. Please reset Docker (docker compose down -v) before seeding.",
    );
  }
  console.log("Database is empty");

  // 2. Insert institution
  const inserted = await db.insert(institutions).values(institutionData).returning();
  const institutionId = inserted[0].id;
  console.log(`Inserted institution with id: ${institutionId}`);

  // 3. Insert institution news
  if (newsData.length > 0) {
    await db.insert(institution_news).values(
      newsData.map((news) => ({
        ...news,
        institution_id: institutionId,
      })),
    );
    console.log(`Inserted ${newsData.length} news entries`);
  }

  // 4. Deduplicate master species by scientific_name
  const speciesMap = new Map<string, MasterSpeciesRecord>();

  for (const species of masterSpeciesData) {
    const scientificName = species.buttId.trim();

    if (!speciesMap.has(scientificName)) {
      speciesMap.set(scientificName, species);
    } else {
      console.warn(`Duplicate species found and ignored: ${scientificName}`);
    }
  }

  const deduplicatedSpecies = Array.from(speciesMap.values());

  // Map to DB shape AFTER deduplication
  const mappedSpecies = deduplicatedSpecies.map((species) => ({
    scientific_name: species.buttId.trim(),
    common_name: species.commonName,
    family: species.family,
    sub_family: species.subFamily,
    lifespan_days: species.lifespan,
    range: species.range,
    host_plant: species.plant ?? null,
    habitat: species.habitat ?? null,
    fun_facts: species.funFacts ?? null,
    img_wings_open: species.imgWingsOpen ?? null,
    img_wings_closed: species.imgWingsClosed ?? null,
    extra_img_1: species.extraImg1 ?? null,
    extra_img_2: species.extraImg2 ?? null,
  }));

  let insertedSpecies: { id: number; scientific_name: string }[] = [];
  if (mappedSpecies.length > 0) {
    insertedSpecies = await db.insert(butterfly_species).values(mappedSpecies).returning({
      id: butterfly_species.id,
      scientific_name: butterfly_species.scientific_name,
    });
  }
  const speciesIdMap = new Map<string, number>();

  for (const s of insertedSpecies) {
    speciesIdMap.set(s.scientific_name, s.id);
  }
  console.log(`Inserted ${insertedSpecies.length} master species`);

  // 5. Insert suppliers
  const mappedSuppliers = suppliersData.map((supplier) => ({
    institution_id: institutionId,
    name: supplier.fullName,
    code: supplier.abbreviation,
    country: supplier.country,
    website_url: supplier.website_url ?? null,
    is_active: supplier.active ?? true,
  }));

  if (mappedSuppliers.length > 0) {
    await db.insert(suppliers).values(mappedSuppliers);
    console.log(`Inserted ${mappedSuppliers.length} suppliers`);
  } else {
    console.log("No suppliers to insert");
  }

  // 6. Validate shipment species + supplier codes
  const masterSpeciesSet = new Set(Array.from(speciesIdMap.keys()));
  const supplierCodeSet = new Set(suppliersData.map((s) => s.abbreviation));
  const missingSpecies = new Set<string>();
  const missingSuppliers = new Set<string>();

  for (const shipment of shipmentsData) {
    if (!supplierCodeSet.has(shipment.abbreviation)) {
      missingSuppliers.add(shipment.abbreviation);
    }

    for (const detail of shipment.butterflyDetails) {
      if (!masterSpeciesSet.has(detail.buttId.trim())) {
        missingSpecies.add(detail.buttId.trim());
      }
    }
  }

  if (missingSpecies.size > 0) {
    throw new Error(`Missing species in master list: ${[...missingSpecies].join(", ")}`);
  }

  if (missingSuppliers.size > 0) {
    throw new Error(`Missing suppliers in suppliers.json: ${[...missingSuppliers].join(", ")}`);
  }

  console.log("Shipment data validated");

  // 7. Insert shipments + shipment_items (transaction)
  const enabledSpecies = new Set<string>();

  await db.transaction(async (tx) => {
    for (const shipment of shipmentsData) {
      const insertedShipment = await tx
        .insert(shipments)
        .values({
          institution_id: institutionId,
          supplier_code: shipment.abbreviation,
          shipment_date: new Date(shipment.shipmentDate),
          arrival_date: new Date(shipment.arrivalDate),
        })
        .returning({ id: shipments.id });

      const shipmentId = insertedShipment[0].id;

      const mappedItems = shipment.butterflyDetails.map((detail) => {
        const speciesId = speciesIdMap.get(detail.buttId.trim());

        if (!speciesId) {
          throw new Error(`Species not found in map: ${detail.buttId}`);
        }

        enabledSpecies.add(detail.buttId.trim());

        return {
          institution_id: institutionId,
          shipment_id: shipmentId,
          butterfly_species_id: speciesId,
          number_received: detail.numberReceived,
          emerged_in_transit: detail.emergedInTransit ?? 0,
          damaged_in_transit: detail.damaged ?? 0,
          diseased_in_transit: detail.diseased ?? 0,
          parasite: detail.parasite ?? 0,
          non_emergence: detail.noEmergence ?? 0,
          poor_emergence: detail.poorEmergence ?? 0,
        };
      });

      await tx.insert(shipment_items).values(mappedItems);
    }
  });
  console.log(`Inserted ${shipmentsData.length} shipments`);

  // 8. Enable species for institution (derived from shipments)
  const enabledSpeciesArray = Array.from(enabledSpecies);
  const mappedInstitutionSpecies = enabledSpeciesArray.map((scientificName) => {
    const speciesId = speciesIdMap.get(scientificName);

    if (!speciesId) {
      throw new Error(`Species not found for enabling: ${scientificName}`);
    }

    return {
      institution_id: institutionId,
      butterfly_species_id: speciesId,
    };
  });

  if (mappedInstitutionSpecies.length > 0) {
    await db.insert(butterfly_species_institution).values(mappedInstitutionSpecies);
  }
  console.log(`Enabled ${mappedInstitutionSpecies.length} species for institution`);

  // 9. Insert users
  const mappedUsers = [];

  for (const user of usersData) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    mappedUsers.push({
      name: user.name,
      email: user.email,
      password_hash: passwordHash,
      institution_id: institutionId,
      role: user.role,
    });
  }

  if (mappedUsers.length > 0) {
    await db.insert(users).values(mappedUsers);
  }
  console.log(`Inserted ${mappedUsers.length} users`);
}

main()
  .then(() => {
    console.log("Seed finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed");
    console.error(err);
    process.exit(1);
  });
