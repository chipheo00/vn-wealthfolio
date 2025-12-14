import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Goal, GoalAllocation, Account } from "@/lib/types";
import { AllocationModal } from "./allocation-modal";

interface GoalAllocationsOverviewProps {
  goals: Goal[];
  allocations: GoalAllocation[];
  accounts: Account[];
  currentAccountValues: Map<string, number>;
  onAllocationCreated: (allocation: GoalAllocation) => Promise<void>;
  readOnly?: boolean;
}

export function GoalAllocationsOverview({
  goals,
  allocations,
  accounts,
  currentAccountValues,
  onAllocationCreated,
  readOnly = false,
}: GoalAllocationsOverviewProps) {
  const [selectedAllocation, setSelectedAllocation] = useState<{
    goal: Goal;
    account: Account;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate totals per account
  const allocationTotals = accounts.map((account) => {
    const accountAllocations = allocations.filter((a) => a.accountId === account.id);
    const totalAmount = accountAllocations.reduce((sum, a) => sum + a.initialContribution, 0);
    const totalPercentage = accountAllocations.reduce((sum, a) => sum + a.allocatedPercent, 0);
    const currentValue = currentAccountValues.get(account.id) || 0;
    const unallocated = Math.max(0, currentValue - totalAmount);

    return {
      account,
      currentValue,
      totalAmount,
      totalPercentage,
      unallocated,
      allocations: accountAllocations,
    };
  });

  return (
    <div className="space-y-4">
      {/* Overview Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted">
              <th className="text-left px-4 py-2">Account</th>
              <th className="text-right px-4 py-2">Current Value</th>
              <th className="text-right px-4 py-2">Allocated</th>
              <th className="text-right px-4 py-2">%</th>
              <th className="text-right px-4 py-2">Unallocated</th>
              {!readOnly && <th className="text-center px-4 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {allocationTotals.map(({ account, currentValue, totalAmount, totalPercentage, unallocated, allocations: accAllocations }) => (
              <tr key={account.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-2 font-semibold">{account.name}</td>
                <td className="text-right px-4 py-2">${currentValue.toFixed(2)}</td>
                <td className="text-right px-4 py-2">${totalAmount.toFixed(2)}</td>
                <td className="text-right px-4 py-2">
                  <span className={totalPercentage > 100 ? "text-red-600 font-semibold" : ""}>
                    {totalPercentage.toFixed(1)}%
                  </span>
                </td>
                <td className="text-right px-4 py-2 text-green-600 font-semibold">
                  ${unallocated.toFixed(2)}
                </td>
                {!readOnly && (
                  <td className="text-center px-4 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Show goals not yet allocated to this account
                        const unallocatedGoals = goals.filter(
                          (g) => !accAllocations.some((a) => a.goalId === g.id)
                        );
                        if (unallocatedGoals.length > 0) {
                          setSelectedAllocation({
                            goal: unallocatedGoals[0],
                            account,
                          });
                          setIsModalOpen(true);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Allocations by Account */}
      <div className="space-y-4">
        {allocationTotals.map(({ account, allocations: accAllocations }) => {
          if (accAllocations.length === 0) return null;

          return (
            <div key={account.id} className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">{account.name} - Allocations</h3>
              <div className="space-y-2">
                {accAllocations.map((alloc) => {
                  const goal = goals.find((g) => g.id === alloc.goalId);
                  if (!goal) return null;

                  return (
                    <div key={alloc.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                      <span>{goal.title}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          ${alloc.initialContribution.toFixed(2)} ({alloc.allocatedPercent.toFixed(1)}%)
                        </span>
                        {!readOnly && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAllocation({ goal, account });
                              setIsModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedAllocation && (
        <AllocationModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          goal={selectedAllocation.goal}
          account={selectedAllocation.account}
          currentAccountValue={currentAccountValues.get(selectedAllocation.account.id) || 0}
          onSubmit={onAllocationCreated}
        />
      )}
    </div>
  );
}
