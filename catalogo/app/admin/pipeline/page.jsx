// app/admin/pipeline/page.jsx
import PipelineClient from "./PipelineClient.jsx";
import { isAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Si falla, el cliente validará con /api/admin/whoami
  await isAdminPage().catch(() => {});
  return (
    <div className="space-y-6">
      <PipelineClient />
    </div>
  );
}

/* fin */
