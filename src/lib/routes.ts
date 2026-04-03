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
    analytics: (slug: string) => `/${slug}/analytics`,
    inventory: (slug: string) => `/${slug}/inventory`,
    shipments: (slug: string) => `/${slug}/shipments`,
    shipmentAdd: (slug: string) => `/${slug}/shipments/add`,
  },
} as const;
