"use client";

import { useState } from "react";
import { CreatePageFlow } from "@/components/page/create-page-flow";
import { PageCreationSuccess } from "@/components/page/page-creation-success";

export function NewPage({ appDomain }: { appDomain: string }) {
  const [createdHandle, setCreatedHandle] = useState<string | null>(null);

  return createdHandle ? (
    <PageCreationSuccess appDomain={appDomain} handle={createdHandle} />
  ) : (
    <CreatePageFlow appDomain={appDomain} onCreated={setCreatedHandle} />
  );
}
