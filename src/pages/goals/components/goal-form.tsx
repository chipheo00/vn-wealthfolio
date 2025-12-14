import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DatePickerInput, Icons, MoneyInput } from "@wealthvn/ui";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { newGoalSchema } from "@/lib/schemas";
import { useGoalMutations } from "@/pages/goals/use-goal-mutations";
import { useAccounts } from "@/hooks/use-accounts";

// Infer type from schema (input type = works with Date)
type NewGoal = z.infer<typeof newGoalSchema>;

interface GoalFormProps {
  defaultValues?: Partial<NewGoal>;
  onSuccess?: () => void;
}

export function GoalForm({ defaultValues, onSuccess = () => undefined }: GoalFormProps) {
  const { t } = useTranslation("goals");
  const navigate = useNavigate();
  const { accounts } = useAccounts();
  const { addGoalMutation, updateGoalMutation, saveAllocationsMutation } = useGoalMutations();

  const form = useForm<NewGoal>({
    resolver: zodResolver(newGoalSchema),
    defaultValues: {
      id: defaultValues?.id,
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      targetAmount: defaultValues?.targetAmount || 0,
      targetReturnRate: defaultValues?.targetReturnRate,
      startDate: defaultValues?.startDate,
      dueDate: defaultValues?.dueDate,
      monthlyInvestment: defaultValues?.monthlyInvestment,
      isAchieved: defaultValues?.isAchieved || false,
    },
  });

  // Auto-calculate monthly investment when target amount, return rate, or dates change
  useEffect(() => {
    const subscription = form.watch((values) => {
      const { targetAmount, targetReturnRate, startDate, dueDate } = values;

      if (!targetAmount || targetReturnRate === undefined || !startDate || !dueDate) {
        return;
      }

      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = dueDate instanceof Date ? dueDate : new Date(dueDate);

      // Calculate months between dates
      const monthsDiff =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

      if (monthsDiff <= 0) {
        return;
      }

      // Calculate monthly investment
      // PMT = Target / [((1 + r)^n - 1) / r]
      const monthlyRate = targetReturnRate / 100 / 12;
      let monthlyInvestment: number;

      if (monthlyRate === 0) {
        monthlyInvestment = targetAmount / monthsDiff;
      } else {
        const compoundFactor = Math.pow(1 + monthlyRate, monthsDiff);
        monthlyInvestment = targetAmount / ((compoundFactor - 1) / monthlyRate);
      }

      // Format to 2 decimal places
      monthlyInvestment = Math.round(monthlyInvestment * 100) / 100;

      form.setValue("monthlyInvestment", monthlyInvestment, { shouldDirty: true });
    });

    return () => subscription.unsubscribe();
  }, [form]);

  function onSubmit(data: NewGoal) {
    const { startDate, dueDate, ...rest } = data;
    // Convert dates to ISO strings for the backend
    const payload = {
      ...rest,
      startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
      dueDate: dueDate instanceof Date ? dueDate.toISOString() : dueDate,
    };
    if (rest.id) {
      return updateGoalMutation.mutate(payload as any, { onSuccess });
    }
    return addGoalMutation.mutate(payload, {
      onSuccess: (createdGoal) => {
        onSuccess();
        
        // Create default allocations (0 amount, 0%) for all accounts
        if (accounts && accounts.length > 0) {
          // Use the goal's start date for allocations
          const allocationDate = createdGoal.startDate 
            ? new Date(createdGoal.startDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          const defaultAllocations = accounts.map((account) => ({
            id: `${createdGoal.id}-${account.id}-${Date.now()}`,
            goalId: createdGoal.id,
            accountId: account.id,
            initialContribution: 0,
            allocatedPercent: 0,
            allocationDate,
          }));
          
          saveAllocationsMutation.mutate(defaultAllocations);
        }
        
        // Show toast with action to add allocations
        toast.success(t("form.postCreation.success"), {
          description: t("form.postCreation.description"),
          action: {
            label: t("form.postCreation.addAllocations"),
            onClick: () => navigate(`/goals/${createdGoal.id}`),
          },
          duration: 8000,
        });
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? t("form.updateTitle") : t("form.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {defaultValues?.id ? t("form.updateDescription") : t("form.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hidden ID field */}
          <input type="hidden" name="id" />

          {/* Goal Name - Full Width */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.fields.title.label")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("form.fields.title.placeholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description - Full Width */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.fields.description.label")}</FormLabel>
                <FormControl>
                  <textarea
                    placeholder={t("form.fields.description.placeholder")}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Amount - Full Width */}
          <FormField
            control={form.control}
            name="targetAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("form.fields.targetAmount.label")}</FormLabel>
                <FormControl>
                  <MoneyInput placeholder={t("form.fields.targetAmount.placeholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Date and Due Date - 2 Column Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <FormLabel className="cursor-help">
                          {t("form.fields.startDate.label")}
                        </FormLabel>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start">
                        <div className="max-w-xs">{t("form.fields.startDate.description")}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <FormControl>
                    <DatePickerInput
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <FormLabel className="cursor-help">
                          {t("form.fields.dueDate.label")}
                        </FormLabel>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start">
                        <div className="max-w-xs">{t("form.fields.dueDate.description")}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <FormControl>
                    <DatePickerInput
                      value={field.value}
                      onChange={field.onChange}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Investment Plan Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Icons.HandCoins className="text-primary h-5 w-5" />
              <h3 className="text-foreground text-lg font-medium">
                {t("form.fields.investmentPlan.title")}
              </h3>
            </div>

            <div className="bg-muted/50 border-border space-y-4 rounded-lg border p-4">
              {/* Target Return Rate */}
              <FormField
                control={form.control}
                name="targetReturnRate"
                render={({ field }) => (
                  <FormItem>
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <FormLabel className="cursor-help">
                            {t("form.fields.targetReturnRate.label")}
                          </FormLabel>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                          <div className="max-w-xs">{t("form.fields.targetReturnRate.hint")}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder={t("form.fields.targetReturnRate.placeholder")}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : parseFloat(value));
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="no-spinner pr-16"
                        />
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                          {t("form.fields.targetReturnRate.suffix")}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Monthly Investment (DCA) - Auto-calculated */}
              <FormField
                control={form.control}
                name="monthlyInvestment"
                render={({ field }) => (
                  <FormItem>
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <FormLabel className="cursor-help">
                            {t("form.fields.monthlyInvestment.label")}
                          </FormLabel>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                          <div className="max-w-xs">
                            {t("form.fields.monthlyInvestment.description")}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <FormControl>
                      <MoneyInput
                        placeholder={t("form.fields.monthlyInvestment.placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Goal Achieved Toggle - Only show in edit mode */}
          {defaultValues?.id ? (
            <FormField
              control={form.control}
              name="isAchieved"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="mt-0!">{t("form.fields.isAchieved.label")}</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <DialogTrigger asChild>
            <Button variant="outline">{t("form.buttons.cancel")}</Button>
          </DialogTrigger>
          <Button type="submit">
            <Icons.Save className="mr-2 h-4 w-4" />
            <span>{defaultValues?.id ? t("form.buttons.update") : t("form.buttons.add")}</span>
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
