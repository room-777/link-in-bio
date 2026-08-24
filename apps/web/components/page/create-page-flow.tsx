"use client";

import { CreateHandleStep } from "@/components/page/create-handle-step";
import { CreateRoleStep } from "@/components/page/create-role-step";
import { useCreatePageFlow } from "@/hooks/use-create-page-flow";

export function CreatePageFlow({
  appDomain,
  onCreated,
}: {
  appDomain: string;
  onCreated: (handle: string) => void;
}) {
  const flow = useCreatePageFlow({ onCreated });

  return (
    <div
      className="t-page-slide t-login-page-slide"
      data-page={flow.isRoleStep ? "2" : "1"}
    >
      <CreateHandleStep appDomain={appDomain} flow={flow} />
      <CreateRoleStep flow={flow} />
    </div>
  );
}
