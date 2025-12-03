import { useQuery } from "@tanstack/react-query";
import { Quote, HoldingType } from "@/lib/types";
import { getLatestQuotes } from "@/commands/market-data";
import { QueryKeys } from "@/lib/query-keys";
import { useHoldings } from "./use-holdings";
import { logger } from "@/adapters";

interface UseLatestQuotesForHoldingsOptions {
  enabled?: boolean;
}

interface HoldingsQuotesData {
  quotes: Record<string, Quote>;
  holdingSymbols: string[];
}

/**
 * Hook to fetch latest quotes for assets in user's holdings
 * Combines holdings data and latest quotes into a single query
 * Note: If quotes are not available in holdings (e.g., newly selected asset),
 * the quote lookup will gracefully fail and the form field remains empty
 * @param accountId - Account ID to fetch holdings for
 * @param options - Query options
 * @returns Object with quotes record, holding symbols, and loading/error states
 */
export function useLatestQuotesForHoldings(
  accountId: string,
  { enabled = true }: UseLatestQuotesForHoldingsOptions = {},
) {
  const { holdings, isLoading: holdingsLoading } = useHoldings(accountId);

  // Extract symbols from non-cash holdings
  const symbols = holdings
    .filter((holding) => holding.holdingType !== HoldingType.CASH && holding.instrument?.symbol)
    .map((holding) => holding.instrument!.symbol);

  const {
    data = { quotes: {}, holdingSymbols: symbols },
    isLoading,
    isError,
    error,
  } = useQuery<HoldingsQuotesData, Error>({
    queryKey: [QueryKeys.LATEST_QUOTES_FOR_HOLDINGS, accountId, symbols.sort().join(",")],
    queryFn: async () => {
      if (symbols.length === 0) {
        logger.info("useLatestQuotesForHoldings: No symbols in holdings, returning empty quotes");
        return { quotes: {}, holdingSymbols: [] };
      }
      logger.info(
        `useLatestQuotesForHoldings: Fetching latest quotes for ${symbols.length} symbols: ${symbols.join(", ")}`
      );
      try {
        const quotes = await getLatestQuotes(symbols);
        logger.info(
          `useLatestQuotesForHoldings: Successfully fetched quotes for ${Object.keys(quotes).length} symbols`
        );
        return { quotes, holdingSymbols: symbols };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error(`useLatestQuotesForHoldings: Error fetching quotes: ${errorMsg}`);
        throw err;
      }
    },
    enabled: enabled && !!accountId && !holdingsLoading && symbols.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  logger.info(
    `useLatestQuotesForHoldings - accountId: ${accountId}, symbols: ${symbols.join(", ")}, loading: ${isLoading || holdingsLoading}, quotesCount: ${Object.keys(data.quotes).length}`
  );

  return {
    quotes: data.quotes,
    holdingSymbols: data.holdingSymbols,
    isLoading: isLoading || holdingsLoading,
    isError,
    error,
  };
}
