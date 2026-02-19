import { redirect } from "next/navigation";

import UploadPageClient from "@/components/UploadPageClient";
import { getServerSessionUser } from "@/lib/auth-server";

export default async function UploadPage() {
  const user = await getServerSessionUser();

  if (!user) {
    redirect("/login?redirect=/upload");
  }

  return <UploadPageClient />;
}


