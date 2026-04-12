ALTER TABLE "butterfly_species"
ALTER COLUMN "fun_facts" TYPE jsonb
USING CASE
  WHEN "fun_facts" IS NULL THEN NULL
  WHEN btrim("fun_facts") = '' THEN NULL
  ELSE jsonb_build_array(
    jsonb_build_object(
      'title',
      'Fun Fact',
      'fact',
      "fun_facts"
    )
  )
END;
