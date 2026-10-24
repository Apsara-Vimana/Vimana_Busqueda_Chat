export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import dynamicImport from "next/dynamic";
import { db } from "@/lib/db";
import { initialProfile } from "@/lib/initial-profile";

const InitialModal = dynamicImport(
  () => import("@/components/modals/initial-modal").then((mod) => mod.InitialModal),
  { ssr: false }
);

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

  return <InitialModal />;
}
