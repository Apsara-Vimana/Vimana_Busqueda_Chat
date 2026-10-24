export const dynamic = "force-dynamic";
<<<<<<< HEAD
=======

import { redirect } from "next/navigation";
>>>>>>> 0fd62f24f2ad0a89e3ae2899b43901fffbb4d52b

import { redirect } from "next/navigation";
import { InitialModal } from "@/components/modals/initial-modal";
import { db } from "@/lib/db";
import { initialProfile } from "@/lib/initial-profile";

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
<<<<<<< HEAD
}
=======
};

export default SetupPage;
>>>>>>> 0fd62f24f2ad0a89e3ae2899b43901fffbb4d52b
