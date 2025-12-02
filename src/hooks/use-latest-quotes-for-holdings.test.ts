import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useLatestQuotesForHoldings } from "./use-latest-quotes-for-holdings";
import * as marketDataCommands from "@/commands/market-data";
import * as holdingsHooks from "./use-holdings";

// Mock dependencies
vi.mock("@/commands/market-data");
vi.mock("./use-holdings");

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useLatestQuotesForHoldings", () => {
  it("should return quotes for holdings symbols", async () => {
    const mockHoldings = [
      {
        id: "1",
        holdingType: "SECURITY",
        accountId: "acc1",
        instrument: { symbol: "AAPL", name: "Apple" },
        quantity: 10,
        localCurrency: "USD",
        baseCurrency: "USD",
        marketValue: { local: 1500, base: 1500 },
        weight: 50,
        asOfDate: "2024-01-01",
      },
      {
        id: "2",
        holdingType: "SECURITY",
        accountId: "acc1",
        instrument: { symbol: "GOOGL", name: "Google" },
        quantity: 5,
        localCurrency: "USD",
        baseCurrency: "USD",
        marketValue: { local: 500, base: 500 },
        weight: 50,
        asOfDate: "2024-01-01",
      },
    ];

    const mockQuotes = {
      AAPL: {
        id: "q1",
        createdAt: "2024-01-01",
        dataSource: "YAHOO",
        timestamp: "2024-01-01",
        symbol: "AAPL",
        open: 145,
        high: 150,
        low: 144,
        volume: 1000000,
        close: 148.5,
        adjclose: 148.5,
        currency: "USD",
      },
      GOOGL: {
        id: "q2",
        createdAt: "2024-01-01",
        dataSource: "YAHOO",
        timestamp: "2024-01-01",
        symbol: "GOOGL",
        open: 95,
        high: 100,
        low: 94,
        volume: 500000,
        close: 98.5,
        adjclose: 98.5,
        currency: "USD",
      },
    };

    vi.mocked(holdingsHooks.useHoldings).mockReturnValue({
      holdings: mockHoldings as any,
      isLoading: false,
      isError: false,
      error: null,
    });

    vi.mocked(marketDataCommands.getLatestQuotes).mockResolvedValue(mockQuotes);

    const { result } = renderHook(() => useLatestQuotesForHoldings("acc1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.quotes).toBeDefined();
    expect(result.current.holdingSymbols).toContain("AAPL");
    expect(result.current.holdingSymbols).toContain("GOOGL");
  });
});
