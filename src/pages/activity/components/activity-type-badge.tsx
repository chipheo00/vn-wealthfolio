import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActivityType, getActivityTypeName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ActivityTypeIcon } from "./activity-type-icon";

interface ActivityTypeBadgeProps {
  type: ActivityType;
  className?: string;
  showLabel?: boolean;
}

// Design update: Bigger icons, No borders, Friendly palette
function getActivityColorClass(type: ActivityType) {
  const bgClass = "bg-[color-mix(in_srgb,var(--theme-brand),transparent_85%)]";

  switch (type) {
    // Primary/Positive Actions -> Emerald Text
    case ActivityType.BUY:
    case ActivityType.DEPOSIT:
    case ActivityType.ADD_HOLDING:
      return `text-emerald-600 dark:text-emerald-400 ${bgClass}`;

    // Income/Gains -> Teal Text
    case ActivityType.DIVIDEND:
    case ActivityType.INTEREST:
    case ActivityType.TRANSFER_IN:
      return `text-teal-600 dark:text-teal-400 ${bgClass}`;

    // Selling/Spending -> Orange Text
    case ActivityType.SELL:
    case ActivityType.WITHDRAWAL:
    case ActivityType.REMOVE_HOLDING:
      return `text-orange-600 dark:text-orange-400 ${bgClass}`;

    // Transfers/Movement -> Sky Text
    case ActivityType.TRANSFER:
    case ActivityType.TRANSFER_OUT:
      return `text-sky-600 dark:text-sky-400 ${bgClass}`;

    // Administrative/Fees -> Violet Text
    case ActivityType.FEE:
    case ActivityType.TAX:
      return `text-violet-600 dark:text-violet-400 ${bgClass}`;

    case ActivityType.SPLIT:
      return `text-indigo-600 dark:text-indigo-400 ${bgClass}`;

    default:
      return `text-slate-600 dark:text-slate-400 ${bgClass}`;
  }
}

export function ActivityTypeBadge({
  type,
  className,
  showLabel = false,
}: ActivityTypeBadgeProps) {
  const { t } = useTranslation("activity");
  const colorClass = getActivityColorClass(type);
  const label = getActivityTypeName(type, t);

  // Remove Badge wrapper styles that add borders (border-transparent to remove default badge border)
  const badgeObj = (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5 transition-colors",
        colorClass,
        className
      )}
    >
      <ActivityTypeIcon type={type} className={cn("size-5", showLabel && "mr-2")} />
      {showLabel && <span className="text-sm font-medium">{label}</span>}
    </div>
  );

  if (showLabel) {
    return badgeObj;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{badgeObj}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
