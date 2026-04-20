interface InstitutionUrlFieldInput {
  volunteer_url?: string | null;
  donation_url?: string | null;
}

interface InstitutionUrlFieldPayload {
  volunteer_url?: string | null;
  donation_url?: string | null;
}

interface PickInstitutionUrlFieldsOptions {
  blankAsNull?: boolean;
}

function normalizeOptionalUrlInput(
  value: string | null | undefined,
  options: PickInstitutionUrlFieldsOptions,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  if (normalized) {
    return normalized;
  }

  return options.blankAsNull ? null : undefined;
}

export function pickInstitutionUrlFields(
  input: InstitutionUrlFieldInput,
  options: PickInstitutionUrlFieldsOptions = {},
): InstitutionUrlFieldPayload {
  const volunteerUrl = normalizeOptionalUrlInput(input.volunteer_url, options);
  const donationUrl = normalizeOptionalUrlInput(input.donation_url, options);

  return {
    ...(volunteerUrl !== undefined ? { volunteer_url: volunteerUrl } : {}),
    ...(donationUrl !== undefined ? { donation_url: donationUrl } : {}),
  };
}
