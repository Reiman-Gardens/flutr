export const ROUTES = {
  home: "/",
  login: "/login",
  unauthorized: "/unauthorized",
  admin: {
    dashboard: "/admin/dashboard",
    institutions: "/admin/institutions",
    institutionAdd: "/admin/institutions/add",
    institutionById: (id: string | number) => `/admin/institutions/${id}`,
    institutionImportPreview: (id: string | number) =>
      `/api/platform/institutions/${id}/shipments/import/preview`,
    institutionImportCommit: (id: string | number) =>
      `/api/platform/institutions/${id}/shipments/import/commit`,
    institutionExportApi: (id: string | number, format: "xlsx" | "csv" = "xlsx") =>
      `/api/platform/institutions/${id}/shipments/export?format=${format}`,
    species: "/admin/species",
    suppliers: "/admin/suppliers",
  },
  tenant: {
    dashboard: (slug: string) => `/${slug}/dashboard`,
    organization: (slug: string) => `/${slug}/organization`,
    shipments: (slug: string) => `/${slug}/shipments`,
    shipmentAdd: (slug: string) => `/${slug}/shipments/add`,
    releases: (slug: string) => `/${slug}/releases`,
    shipmentImportPreviewApi: "/api/tenant/shipments/import/preview",
    shipmentImportCommitApi: "/api/tenant/shipments/import/commit",
    shipmentExportApi: (format: "xlsx" | "csv" = "xlsx") =>
      `/api/tenant/shipments/export?format=${format}`,
  },
} as const;
