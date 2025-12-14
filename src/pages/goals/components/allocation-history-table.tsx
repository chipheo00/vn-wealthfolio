import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDateFormatter } from "@/hooks/use-date-formatter";
import { Account, AllocationVersion, GoalAllocation } from "@/lib/types";
import { invoke } from "@tauri-apps/api/core";
import { Icons } from "@wealthvn/ui";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AllocationModal } from "./allocation-modal";

interface AllocationHistoryTableProps {
  goalId: string;
  allocations: GoalAllocation[];
  accounts: Map<string, Account>;
  currentAccountValues: Map<string, number>;
  onAllocationUpdated: (allocation: GoalAllocation) => Promise<void>;
  onAllocationDeleted?: (allocationId: string) => Promise<void>;
  readOnly?: boolean;
}

export function AllocationHistoryTable({
  goalId,
  allocations,
  accounts,
  currentAccountValues,
  onAllocationUpdated,
  onAllocationDeleted,
  readOnly = false,
}: AllocationHistoryTableProps) {
  const [expandedAllocationId, setExpandedAllocationId] = useState<string | null>(null);
  const [allocationVersions, setAllocationVersions] = useState<Record<string, AllocationVersion[]>>({});
  const [isLoadingVersions, setIsLoadingVersions] = useState<Set<string>>(new Set());
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [allocationToDelete, setAllocationToDelete] = useState<GoalAllocation | null>(null);
  const { formatActivityDate } = useDateFormatter();
  const { t } = useTranslation("goals");

  // Fetch allocation versions when expanded
  const handleExpandAllocation = async (allocationId: string) => {
    if (expandedAllocationId === allocationId) {
      setExpandedAllocationId(null);
      return;
    }

    if (!allocationVersions[allocationId]) {
      setIsLoadingVersions((prev) => new Set([...prev, allocationId]));
      try {
        const versions: AllocationVersion[] = await invoke("get_allocation_versions", {
          allocationId,
        });
        setAllocationVersions((prev) => ({
          ...prev,
          [allocationId]: versions,
        }));
      } catch (err) {
        console.error("Failed to fetch allocation versions:", err);
      } finally {
        setIsLoadingVersions((prev) => {
          const next = new Set(prev);
          next.delete(allocationId);
          return next;
        });
      }
    }

    setExpandedAllocationId(allocationId);
  };

  const currentAllocation = allocations.find((a) => a.id === editingAllocationId);

  return (
    <div className="space-y-4">
      {/* Current Allocations Table */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Current Allocations</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left px-4 py-2">Account</th>
                <th className="text-right px-4 py-2">Initial Contribution</th>
                <th className="text-right px-4 py-2">%</th>
                <th className="text-right px-4 py-2">Contributed Value</th>
                <th className="text-center px-4 py-2">Started</th>
                {!readOnly && <th className="text-center px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => {
                const account = accounts.get(alloc.accountId);
                const currentValue = currentAccountValues.get(alloc.accountId) || 0;

                return (
                  <React.Fragment key={alloc.id}>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2">{account?.name}</td>
                      <td className="text-right px-4 py-2">
                        ${alloc.allocationAmount.toFixed(2)}
                      </td>
                      <td className="text-right px-4 py-2">{alloc.allocationPercentage.toFixed(1)}%</td>
                      <td className="text-right px-4 py-2 font-semibold">
                        ${(alloc.initAmount + (currentValue - alloc.initAmount) * (alloc.allocationPercentage / 100)).toFixed(2)}
                      </td>
                      <td className="text-center px-4 py-2 text-xs text-muted-foreground">
                        {alloc.allocationDate ? formatActivityDate(alloc.allocationDate) : "-"}
                      </td>
                      {!readOnly && (
                        <td className="text-center px-4 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                              >
                                <Icons.MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingAllocationId(alloc.id);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                {t("operations.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleExpandAllocation(alloc.id)}
                              >
                                {expandedAllocationId === alloc.id ? "Hide History" : "View History"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setAllocationToDelete(alloc)}
                              >
                                {t("operations.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>

                    {/* Expanded history row */}
                    {expandedAllocationId === alloc.id && (
                      <tr>
                        <td colSpan={readOnly ? 5 : 6} className="px-4 py-4 bg-muted/30">
                          {isLoadingVersions.has(alloc.id) ? (
                            <p className="text-sm text-muted-foreground">Loading history...</p>
                          ) : (
                            <AllocationVersionsTable
                              versions={allocationVersions[alloc.id] || []}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {currentAllocation && (
        <AllocationModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          goal={{ id: goalId, title: "" }}
          account={accounts.get(currentAllocation.accountId) || { id: "", name: "" } as Account}
          currentAllocation={currentAllocation}
          currentAccountValue={currentAccountValues.get(currentAllocation.accountId) || 0}
          onSubmit={onAllocationUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={!!allocationToDelete}
        onOpenChange={(open) => !open && setAllocationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAllocation.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAllocation.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("editModal.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (allocationToDelete && onAllocationDeleted) {
                  await onAllocationDeleted(allocationToDelete.id);
                  setAllocationToDelete(null);
                }
              }}
            >
              {t("deleteAllocation.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-component for allocation versions
function AllocationVersionsTable({ versions }: { versions: AllocationVersion[] }) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">No version history</p>;
  }

  return (
    <div className="bg-white rounded-md border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-3 py-2">Period</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="text-right px-3 py-2">%</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => {
            const endDate = version.versionEndDate || "Current";

            return (
              <tr key={version.id} className="border-b text-xs hover:bg-muted/30">
                <td className="px-3 py-2">
                  {version.versionStartDate} to {endDate}
                </td>
                <td className="text-right px-3 py-2">
                  ${version.allocationAmount.toFixed(2)}
                </td>
                <td className="text-right px-3 py-2">
                  {version.allocationPercentage.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
