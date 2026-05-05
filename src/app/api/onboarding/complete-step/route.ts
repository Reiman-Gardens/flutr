import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { updateOnboardingProgress } from "@/lib/queries/onboarding";
import type { OnboardingStep } from "@/types/onboarding";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { completedStep, nextStep, isBackNavigation } = (await req.json()) as {
      completedStep: OnboardingStep;
      nextStep: OnboardingStep | null;
      isBackNavigation?: boolean;
    };

    // Get institution from session
    const institutionId = session.user.institutionId;

    if (!institutionId) {
      return new Response(JSON.stringify({ error: "Missing institution ID" }), {
        status: 400,
      });
    }

    // Look up user by email and institution to get numeric user ID
    const [userRecord] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, session.user.email), eq(users.institution_id, institutionId)))
      .limit(1);

    if (!userRecord) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
      });
    }

    const userId = userRecord.id;

    const updated = await updateOnboardingProgress(
      userId,
      institutionId,
      completedStep,
      nextStep,
      isBackNavigation,
    );

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in complete-step:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
