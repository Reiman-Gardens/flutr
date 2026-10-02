UPDATE "shipment_items" AS si
SET "good_emergence" = COALESCE(
        (
            SELECT SUM(i."quantity")::integer
            FROM "in_flight" AS i
            WHERE i."institution_id" = si."institution_id"
                AND i."shipment_item_id" = si."id"
        ),
        0
    );
ALTER TABLE "shipment_items"
ADD CONSTRAINT "shipment_items_good_emergence_nonnegative" CHECK ("shipment_items"."good_emergence" >= 0);