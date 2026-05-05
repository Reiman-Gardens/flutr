import { db } from "@/lib/db";
import { user_onboarding } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import type { UserOnboardingState, OnboardingStep } from "@/types/onboarding";

/**
 * Get or create user onboarding state
 * Returns existing state if user has started tour, creates new state if first login
 */
export async function getOrCreateUserOnboarding(
  userId: number,
  institutionId: number,
): Promise<UserOnboardingState> {
  const existing = await db
    .select()
    .from(user_onboarding)
    .where(
      and(eq(user_onboarding.user_id, userId), eq(user_onboarding.institution_id, institutionId)),
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      userId: existing[0].user_id,
      institutionId: existing[0].institution_id,
      currentStep: existing[0].current_step as OnboardingStep,
      completedSteps: (existing[0].completed_steps as OnboardingStep[]) || [],
      tourCompleted: existing[0].tour_completed,
      createdAt: existing[0].created_at,
      updatedAt: existing[0].updated_at,
    };
  }

  // Create new onboarding record for first-time user
  const [newRecord] = await db
    .insert(user_onboarding)
    .values({
      user_id: userId,
      institution_id: institutionId,
      current_step: "dashboard",
      completed_steps: [],
      tour_completed: false,
    })
    .returning();

  return {
    userId: newRecord.user_id,
    institutionId: newRecord.institution_id,
    currentStep: "dashboard",
    completedSteps: [],
    tourCompleted: false,
    createdAt: newRecord.created_at,
    updatedAt: newRecord.updated_at,
  };
}

/**
 * Update onboarding progress
 * Marks a step as completed and moves to next step
 * If isBackNavigation is true, doesn't mark step as completed
 */
export async function updateOnboardingProgress(
  userId: number,
  institutionId: number,
  completedStep: OnboardingStep,
  nextStep: OnboardingStep | null,
  isBackNavigation?: boolean,
): Promise<UserOnboardingState> {
  const current = await db
    .select()
    .from(user_onboarding)
    .where(
      and(eq(user_onboarding.user_id, userId), eq(user_onboarding.institution_id, institutionId)),
    )
    .limit(1);

  if (current.length === 0) {
    throw new Error("Onboarding record not found");
  }

  const completedSteps = Array.isArray(current[0].completed_steps)
    ? (current[0].completed_steps as OnboardingStep[])
    : [];

  // Add to completed only if not going back
  if (!isBackNavigation && !completedSteps.includes(completedStep)) {
    completedSteps.push(completedStep);
  }

  const isTourComplete = nextStep === null;

  const [updated] = await db
    .update(user_onboarding)
    .set({
      current_step: nextStep || "settings", // Default to last step if tour complete
      completed_steps: completedSteps,
      tour_completed: isTourComplete,
      updated_at: new Date(),
    })
    .where(
      and(eq(user_onboarding.user_id, userId), eq(user_onboarding.institution_id, institutionId)),
    )
    .returning();

  return {
    userId: updated.user_id,
    institutionId: updated.institution_id,
    currentStep: updated.current_step as OnboardingStep,
    completedSteps: (updated.completed_steps as OnboardingStep[]) || [],
    tourCompleted: updated.tour_completed,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

/**
 * Reset onboarding tour to allow replay
 */
export async function resetOnboardingTour(
  userId: number,
  institutionId: number,
): Promise<UserOnboardingState> {
  const [updated] = await db
    .update(user_onboarding)
    .set({
      current_step: "dashboard",
      completed_steps: [],
      tour_completed: false,
      updated_at: new Date(),
    })
    .where(
      and(eq(user_onboarding.user_id, userId), eq(user_onboarding.institution_id, institutionId)),
    )
    .returning();

  return {
    userId: updated.user_id,
    institutionId: updated.institution_id,
    currentStep: "dashboard",
    completedSteps: [],
    tourCompleted: false,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

/**
 * Check if user should see onboarding (only on first login)
 */
export async function shouldShowOnboarding(
  userId: number,
  institutionId: number,
): Promise<boolean> {
  const record = await db
    .select()
    .from(user_onboarding)
    .where(
      and(eq(user_onboarding.user_id, userId), eq(user_onboarding.institution_id, institutionId)),
    )
    .limit(1);

  // Show if record doesn't exist yet (first time user)
  if (record.length === 0) {
    return true;
  }

  // Show if tour not completed yet
  return !record[0].tour_completed;
}
