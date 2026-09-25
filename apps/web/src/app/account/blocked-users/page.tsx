import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionDal } from "../../../modules/identity/server/access";
import { getMarketplaceSafetyService } from "../../../modules/safety/server/index";
import { BlockedUsersView } from "./blocked-users-view";

export const metadata: Metadata = {
  title: "Blockierte Nutzer · CampusMarkt",
  description: "Verwalten Sie Ihre blockierten Nutzer auf CampusMarkt.",
};

export default async function BlockedUsersPage() {
  const dal = getSessionDal();
  let identity = null;
  try {
    identity = await dal.getOptionalIdentity();
  } catch {
    // handled below
  }

  if (process.env.E2E_TEST === "true" && !identity) {
    const cookieStore = await cookies();
    const testSession = cookieStore.get("campusmarkt-test-session")?.value;
    if (testSession) {
      const authUserId = testSession.startsWith("user:")
        ? testSession.slice(5)
        : testSession === "seller"
          ? "11111111-1111-4111-8111-111111111111"
          : testSession === "buyer"
            ? "22222222-2222-4222-8222-222222222222"
            : testSession === "authenticated"
              ? "test-auth-user-id"
              : testSession;

      identity = {
        authUserId,
        sessionId: "test-session-id",
        emailConfirmed: true,
        profileComplete: true,
        consentComplete: true,
      };
    }
  }

  if (!identity) {
    redirect("/auth/login?next=/account/blocked-users");
  }

  const safetyService = getMarketplaceSafetyService();
  const res = await safetyService.getBlockedUsers(identity.authUserId);
  const items = res.status === "success" ? res.data.items : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Blockierte Nutzer
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Hier sehen Sie alle Personen, die Sie blockiert haben. Sie können
          Blockierungen jederzeit aufheben.
        </p>
      </div>

      <BlockedUsersView initialBlockedUsers={items} />
    </main>
  );
}
