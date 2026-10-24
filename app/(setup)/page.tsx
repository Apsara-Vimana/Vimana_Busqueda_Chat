"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { InitialModal } from "@/components/modals/initial-modal";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <InitialModal />;
}
