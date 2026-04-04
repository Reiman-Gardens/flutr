export const ROUTES = {
  home: "/",
  login: "/login",
  unauthorized: "/unauthorized",
  admin: {
    dashboard: "/admin/dashboard",
    institutions: "/admin/institutions",
    institutionAdd: "/admin/institutions/add",
    institutionById: (id: string | number) => `/admin/institutions/${id}`,
    species: "/admin/species",
    suppliers: "/admin/suppliers",
  },
  tenant: {
    dashboard: (slug: string) => `/${slug}/dashboard`,
    organization: (slug: string) => `/${slug}/organization`,
    shipments: (slug: string) => `/${slug}/shipments`,
    shipmentAdd: (slug: string) => `/${slug}/shipments/add`,
    releases: (slug: string) => `/${slug}/releases`,
  },
} as const;
