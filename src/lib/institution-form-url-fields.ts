interface InstitutionUrlFieldInput {
  volunteer_url?: string | null;
  donation_url?: string | null;
}

interface InstitutionUrlFieldPayload {
  volunteer_url?: string;
  donation_url?: string;
}

function normalizeOptionalUrlInput(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function pickInstitutionUrlFields(
  input: InstitutionUrlFieldInput,
): InstitutionUrlFieldPayload {
  const volunteerUrl = normalizeOptionalUrlInput(input.volunteer_url);
  const donationUrl = normalizeOptionalUrlInput(input.donation_url);

  return {
    ...(volunteerUrl ? { volunteer_url: volunteerUrl } : {}),
    ...(donationUrl ? { donation_url: donationUrl } : {}),
  };
}
