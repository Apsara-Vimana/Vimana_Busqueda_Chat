import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { initialProfile } from "@/lib/initial-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Usamos dynamicImport para evitar el choque de nombres con 'export const dynamic'
const SetupClient = dynamicImport(() => import("./setup-client"), {
  ssr: false,
});

export default async function SetupPage() {
  const profile = await initialProfile();

  const server = await db.server.findFirst({
    where: {
      members: {
        some: {
          profileId: profile.id,
        },
      },
    },
  });

  if (server) {
    return redirect(`/servers/${server.id}`);
  }

  return <SetupClient />;
}
