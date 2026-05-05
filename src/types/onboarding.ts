/**
 * Onboarding Tour Types
 *
 * Defines the structure and workflow for the admin onboarding tour.
 * Each step represents a page or feature to explain.
 */

export type OnboardingStep =
  | "dashboard"
  | "shipments"
  | "releases"
  | "gallery"
  | "news"
  | "settings";

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  pagePattern: string; // URL pattern to match (e.g., "/admin" or "/admin/shipments")
  highlights: OnboardingHighlight[];
  instruction: string;
  nextButtonLabel?: string;
}

export interface OnboardingHighlight {
  selector: string; // CSS selector for element to highlight
  label: string; // Brief label for what's being highlighted
  tooltip: string; // Explanation of what this feature does
  position?: "top" | "bottom" | "left" | "right";
}

export interface UserOnboardingState {
  userId: number;
  institutionId: number;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  tourCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const ONBOARDING_STEPS: Record<OnboardingStep, OnboardingStepConfig> = {
  dashboard: {
    id: "dashboard",
    title: "Welcome to Your Dashboard",
    description:
      "Let's walk through the key features you'll use to manage butterfly releases and track data.",
    pagePattern: "/dashboard",
    instruction:
      "The navigation panel provides quick access to all major features. Let's explore each one.",
    highlights: [
      {
        selector: '[data-onboarding="nav"]',
        label: "Main Navigation",
        tooltip:
          "Quick access to Shipments and Organization settings. Click these to navigate between features.",
        position: "right",
      },
    ],
    nextButtonLabel: "Continue to Shipments",
  },
  shipments: {
    id: "shipments",
    title: "Managing Shipments",
    description: "Shipments are how you receive and track butterflies from suppliers.",
    pagePattern: "/shipments",
    instruction:
      "Create and manage butterfly shipments. Here you can add new shipments, view existing ones, and track their status.",
    highlights: [
      {
        selector: '[data-onboarding="import-btn"]',
        label: "Add Shipment",
        tooltip:
          "Create a new shipment record. This is where you'll track arrivals from suppliers.",
        position: "bottom",
      },
      {
        selector: '[data-onboarding="shipment-table"]',
        label: "Shipment List",
        tooltip:
          "View all received shipments, sorted by shipment date. Click on any shipment to see details and manage releases.",
        position: "right",
      },
    ],
    nextButtonLabel: "Continue to Releases",
  },
  releases: {
    id: "releases",
    title: "Tracking Butterfly Releases",
    description:
      "Releases are when you release butterflies into your facility. Track them from the shipment details.",
    pagePattern: "/shipments",
    instruction:
      "From any shipment, you can create release events to track which butterflies were released and any losses.",
    highlights: [
      {
        selector: '[data-onboarding="create-release"]',
        label: "Create Release",
        tooltip:
          "Start a new release event from a shipment. Record release date and any butterfly losses.",
        position: "bottom",
      },
      {
        selector: '[data-onboarding="release-table"]',
        label: "Release History",
        tooltip: "View all past releases linked to a shipment with dates and quantities.",
        position: "right",
      },
    ],
    nextButtonLabel: "Continue to Gallery",
  },
  gallery: {
    id: "gallery",
    title: "Public Species Gallery",
    description:
      "The gallery is your public-facing showcase of butterfly species currently in your facility.",
    pagePattern: "/gallery",
    instruction:
      "Search and browse all butterfly species. This page is public-facing, so visitors can learn about your collection.",
    highlights: [
      {
        selector: '[data-onboarding="species-grid"]',
        label: "Species Cards",
        tooltip: "Each card shows a butterfly species with images and in-flight count.",
        position: "right",
      },
      {
        selector: '[data-onboarding="species-search"]',
        label: "Search & Filter",
        tooltip:
          "Find species by name or family. Sort by name, scientific name, or in-flight count.",
        position: "bottom",
      },
    ],
    nextButtonLabel: "Continue to News",
  },
  news: {
    id: "news",
    title: "Share Institution News",
    description:
      "Keep your visitors informed with updates about events, exhibits, and conservation efforts.",
    pagePattern: "/organization",
    instruction:
      "Publish news articles on your public site. These appear on your homepage to keep visitors engaged.",
    highlights: [
      {
        selector: '[data-onboarding="news-section"]',
        label: "News Management",
        tooltip:
          "Add, edit, and publish news articles. They appear on your institution's public-facing pages.",
        position: "right",
      },
    ],
    nextButtonLabel: "Continue to Settings",
  },
  settings: {
    id: "settings",
    title: "Organization Settings",
    description: "Manage your facility's information and branding.",
    pagePattern: "/organization",
    instruction:
      "Update your organization's details, theme colors, and social links. This information appears on your public-facing pages.",
    highlights: [
      {
        selector: '[data-onboarding="org-info"]',
        label: "Organization Info",
        tooltip: "Your facility name, address, contact information, and website links.",
        position: "right",
      },
      {
        selector: '[data-onboarding="theme-settings"]',
        label: "Theme & Branding",
        tooltip: "Customize colors, logo, and facility image to match your brand.",
        position: "right",
      },
      {
        selector: '[data-onboarding="social-links"]',
        label: "Social Media",
        tooltip: "Add links to your social media profiles and volunteer/donation pages.",
        position: "bottom",
      },
    ],
    nextButtonLabel: "Finish Tour",
  },
};

export const ONBOARDING_STEPS_ORDER: OnboardingStep[] = [
  "dashboard",
  "shipments",
  "releases",
  "gallery",
  "news",
  "settings",
];

export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === ONBOARDING_STEPS_ORDER.length - 1) {
    return null;
  }
  return ONBOARDING_STEPS_ORDER[currentIndex + 1];
}

export function getPrevStep(currentStep: OnboardingStep): OnboardingStep | null {
  const currentIndex = ONBOARDING_STEPS_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return ONBOARDING_STEPS_ORDER[currentIndex - 1];
}
