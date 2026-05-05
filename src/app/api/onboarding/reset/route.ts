import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { resetOnboardingTour } from "@/lib/queries/onboarding";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

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

    const reset = await resetOnboardingTour(userId, institutionId);

    return new Response(JSON.stringify(reset), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in reset:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
