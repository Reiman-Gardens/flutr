const htmlTagPattern = /<[^>]*>/g;

export function stripHtml(input: string) {
  return input.replace(htmlTagPattern, "");
}

export function sanitizeText(input: string) {
  return stripHtml(input).trim();
}
