interface InstitutionInvolvementLinkInput {
  volunteer_url?: string | null;
  donation_url?: string | null;
}

export function normalizeExternalHttpUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (!/^https?:\/\/\S+$/i.test(normalized)) return null;
  return normalized;
}

export function resolveInstitutionInvolvementLinks(input: InstitutionInvolvementLinkInput) {
  const donationUrl = normalizeExternalHttpUrl(input.donation_url);
  const volunteerUrl = normalizeExternalHttpUrl(input.volunteer_url);

  return {
    donationUrl,
    volunteerUrl,
    hasDonationUrl: donationUrl !== null,
    hasVolunteerUrl: volunteerUrl !== null,
  };
}
