"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BuilderWorkspace } from "@/components/builder/builder-workspace";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";

export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: workflow,
    loading,
    error,
  } = useAsyncData(() => api.workflows.get(id), [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size={22} className="text-muted-foreground" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon="workflow"
          title="Workflow not found"
          description="It may have been deleted or the link is incorrect."
          action={
            <Link href="/workflows">
              <Button variant="outline">Back to workflows</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return <BuilderWorkspace workflow={workflow} />;
}
