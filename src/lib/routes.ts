export const ROUTES = {
  home: "/",
  login: "/login",
  unauthorized: "/unauthorized",
  admin: {
    dashboard: "/admin/dashboard",
    institutions: "/admin/institutions",
    institutionAdd: "/admin/institutions/add",
    institutionById: (id: string | number) => `/admin/institutions/${id}`,
    institutionShipmentsApi: (id: string | number) => `/api/platform/institutions/${id}/shipments`,
    institutionImportPreview: (id: string | number) =>
      `/api/platform/institutions/${id}/shipments/import/preview`,
    institutionImportCommit: (id: string | number) =>
      `/api/platform/institutions/${id}/shipments/import/commit`,
    institutionExportApi: (
      id: string | number,
      format: "xlsx" | "csv" = "xlsx",
      range?: { from?: string; to?: string },
    ) => {
      const params = new URLSearchParams({ format });
      if (range?.from) params.set("from", range.from);
      if (range?.to) params.set("to", range.to);
      return `/api/platform/institutions/${id}/shipments/export?${params.toString()}`;
    },
    species: "/admin/species",
    suppliers: "/admin/suppliers",
  },
  tenant: {
    dashboard: (slug: string) => `/${slug}/dashboard`,
    organization: (slug: string) => `/${slug}/organization`,
    shipments: (slug: string) => `/${slug}/shipments`,
    shipmentAdd: (slug: string) => `/${slug}/shipments/add`,
    releases: (slug: string) => `/${slug}/releases`,
    shipmentsApi: "/api/tenant/shipments",
    shipmentSummaryApi: "/api/tenant/shipments/summary",
    shipmentImportPreviewApi: "/api/tenant/shipments/import/preview",
    shipmentImportCommitApi: "/api/tenant/shipments/import/commit",
    shipmentExportApi: (
      format: "xlsx" | "csv" = "xlsx",
      range?: { from?: string; to?: string },
    ) => {
      const params = new URLSearchParams({ format });
      if (range?.from) params.set("from", range.from);
      if (range?.to) params.set("to", range.to);
      return `/api/tenant/shipments/export?${params.toString()}`;
    },
  },
} as const;
