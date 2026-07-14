"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { api } from "@/lib/api";
import type { Workflow } from "@/lib/types";
import { download } from "@/lib/utils";
import { useConfirm } from "@/providers/confirm-provider";
import { useToast } from "@/providers/toast-provider";

export function useWorkflowActions() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const openBuilder = useCallback(
    (id: string) => router.push(`/builder/${id}`),
    [router],
  );

  const toggleFavorite = useCallback(
    async (wf: Pick<Workflow, "id" | "favorite">) => {
      await api.workflows.toggleFavorite(wf.id);
      toast.success(
        wf.favorite ? "Removed from favorites" : "Added to favorites",
      );
    },
    [toast],
  );

  const duplicate = useCallback(
    async (id: string) => {
      const copy = await api.workflows.duplicate(id);
      toast.success("Workflow duplicated", `Created "${copy.name}"`);
      return copy;
    },
    [toast],
  );

  const run = useCallback(
    async (id: string) => {
      toast.info("Execution started");
      const exec = await api.workflows.run(id);
      if (exec.status === "success") toast.success("Execution completed");
      else toast.error("Execution failed", "One or more nodes failed.");
      return exec;
    },
    [toast],
  );

  const archive = useCallback(
    async (wf: Pick<Workflow, "id" | "name">) => {
      const ok = await confirm({
        title: `Archive "${wf.name}"?`,
        description:
          "It will be moved to the archive. You can restore it later.",
        confirmText: "Archive",
        icon: "archive",
      });
      if (!ok) return false;
      await api.workflows.setArchived(wf.id, true);
      toast.success("Workflow archived");
      return true;
    },
    [confirm, toast],
  );

  const restore = useCallback(
    async (id: string) => {
      await api.workflows.setArchived(id, false);
      toast.success("Workflow restored");
    },
    [toast],
  );

  const remove = useCallback(
    async (wf: Pick<Workflow, "id" | "name">) => {
      const ok = await confirm({
        title: `Delete "${wf.name}"?`,
        description:
          "This permanently deletes the workflow and cannot be undone.",
        confirmText: "Delete",
        tone: "danger",
        icon: "trash",
      });
      if (!ok) return false;
      await api.workflows.remove(wf.id);
      toast.success("Workflow deleted");
      return true;
    },
    [confirm, toast],
  );

  const exportWorkflows = useCallback(
    (workflows: Workflow[]) => {
      const payload = workflows.length === 1 ? workflows[0] : workflows;
      download(
        `flowforge-${workflows.length === 1 ? workflows[0].name.replace(/\s+/g, "-").toLowerCase() : "workflows"}.json`,
        JSON.stringify(payload, null, 2),
      );
      toast.success(
        `Exported ${workflows.length} workflow${workflows.length === 1 ? "" : "s"}`,
      );
    },
    [toast],
  );

  return {
    openBuilder,
    toggleFavorite,
    duplicate,
    run,
    archive,
    restore,
    remove,
    exportWorkflows,
  };
}
