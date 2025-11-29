//! VN Market Service - Facade for all VN market data operations
//!
//! This service coordinates between API clients and caching layers
//! to provide a unified interface for Vietnamese market data.

use chrono::NaiveDate;
use rust_decimal::Decimal;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::vn_market::cache::models::{CachedQuote, VnAssetType, VnHistoricalRecord};
use crate::vn_market::cache::quote_cache::VnQuoteCache;
use crate::vn_market::clients::{FMarketClient, SjcClient, VciClient};
use crate::vn_market::errors::VnMarketError;
use crate::vn_market::models::gold::is_gold_symbol;
use crate::vn_market::models::stock::map_index_symbol;

/// VN Market Service providing unified access to Vietnamese market data
pub struct VnMarketService {
    /// VCI client for stocks and indices
    vci_client: VciClient,
    /// FMarket client for mutual funds
    fmarket_client: Arc<RwLock<FMarketClient>>,
    /// SJC client for gold prices
    sjc_client: SjcClient,
    /// In-memory quote cache
    quote_cache: VnQuoteCache,
    /// Fund symbol -> fund_id mapping
    fund_ids: Arc<RwLock<HashMap<String, i32>>>,
    /// Known fund symbols (for detection)
    known_funds: Arc<RwLock<Vec<String>>>,
}

impl VnMarketService {
    /// Create a new VN Market Service
    pub fn new() -> Self {
        Self {
            vci_client: VciClient::new(),
            fmarket_client: Arc::new(RwLock::new(FMarketClient::new())),
            sjc_client: SjcClient::new(),
            quote_cache: VnQuoteCache::new(),
            fund_ids: Arc::new(RwLock::new(HashMap::new())),
            known_funds: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Initialize the service (load fund list, etc.)
    pub async fn initialize(&self) -> Result<(), VnMarketError> {
        self.refresh_fund_cache().await?;
        Ok(())
    }

    /// Refresh fund ID cache
    pub async fn refresh_fund_cache(&self) -> Result<usize, VnMarketError> {
        let mut client = self.fmarket_client.write().await;
        let count = client.refresh_fund_cache().await?;

        // Update known funds list
        let funds = client.get_funds_listing().await?;
        let mut known = self.known_funds.write().await;
        known.clear();
        for fund in &funds {
            known.push(fund.short_name.to_uppercase());
            if let Some(code) = &fund.code {
                known.push(code.to_uppercase());
            }
        }

        // Update fund IDs map
        let mut ids = self.fund_ids.write().await;
        ids.clear();
        for fund in funds {
            ids.insert(fund.short_name.to_uppercase(), fund.id);
            if let Some(code) = fund.code {
                ids.insert(code.to_uppercase(), fund.id);
            }
        }

        Ok(count)
    }

    /// Detect asset type from symbol
    pub async fn detect_asset_type(&self, symbol: &str) -> VnAssetType {
        let symbol_upper = symbol.to_uppercase();

        // Check for gold symbols
        if is_gold_symbol(symbol) {
            return VnAssetType::Gold;
        }

        // Check for index symbols
        if map_index_symbol(&symbol_upper).is_some()
            || symbol_upper.contains("INDEX")
            || symbol_upper == "VN30"
            || symbol_upper == "HNX30"
        {
            return VnAssetType::Index;
        }

        // Check for known fund symbols
        let known = self.known_funds.read().await;
        if known.contains(&symbol_upper) {
            return VnAssetType::Fund;
        }

        // Default to stock
        VnAssetType::Stock
    }

    /// Get latest quote for a symbol
    pub async fn get_latest_quote(&self, symbol: &str) -> Result<CachedQuote, VnMarketError> {
        let asset_type = self.detect_asset_type(symbol).await;

        // Check cache first
        if let Some(cached) = self.quote_cache.get(symbol, asset_type).await {
            return Ok(cached);
        }

        // Fetch from appropriate client
        let quote = match asset_type {
            VnAssetType::Stock | VnAssetType::Index => self.fetch_stock_quote(symbol).await?,
            VnAssetType::Fund => self.fetch_fund_quote(symbol).await?,
            VnAssetType::Gold => self.fetch_gold_quote(symbol).await?,
        };

        // Store in cache
        self.quote_cache.set(quote.clone()).await;

        Ok(quote)
    }

    /// Get historical quotes for a symbol
    pub async fn get_history(
        &self,
        symbol: &str,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<VnHistoricalRecord>, VnMarketError> {
        let asset_type = self.detect_asset_type(symbol).await;

        match asset_type {
            VnAssetType::Stock | VnAssetType::Index => {
                self.fetch_stock_history(symbol, start, end).await
            }
            VnAssetType::Fund => self.fetch_fund_history(symbol, start, end).await,
            VnAssetType::Gold => self.fetch_gold_history(symbol, start, end).await,
        }
    }

    /// Fetch stock/index quote from VCI
    async fn fetch_stock_quote(&self, symbol: &str) -> Result<CachedQuote, VnMarketError> {
        let quote = self
            .vci_client
            .get_latest_quote(symbol)
            .await?
            .ok_or_else(|| VnMarketError::NoData {
                symbol: symbol.to_string(),
                date: "latest".to_string(),
            })?;

        Ok(CachedQuote {
            symbol: quote.symbol,
            asset_type: VnAssetType::Stock,
            date: quote.timestamp.date_naive(),
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: Decimal::from(quote.volume),
            nav: None,
            buy_price: None,
            sell_price: None,
            currency: "VND".to_string(),
        })
    }

    /// Fetch fund quote from FMarket
    async fn fetch_fund_quote(&self, symbol: &str) -> Result<CachedQuote, VnMarketError> {
        let fund_id = {
            let ids = self.fund_ids.read().await;
            ids.get(&symbol.to_uppercase())
                .copied()
                .ok_or_else(|| VnMarketError::FundNotFound(symbol.to_string()))?
        };

        // Get latest NAV from all history
        let mut client = self.fmarket_client.write().await;
        let history = client.get_all_nav_history(fund_id).await?;

        let latest = history
            .last()
            .ok_or_else(|| VnMarketError::NoData {
                symbol: symbol.to_string(),
                date: "latest".to_string(),
            })?;

        let date = NaiveDate::parse_from_str(&latest.normalized_date(), "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Utc::now().date_naive());

        let nav = Decimal::from_f64_retain(latest.nav).unwrap_or_default();

        Ok(CachedQuote {
            symbol: symbol.to_string(),
            asset_type: VnAssetType::Fund,
            date,
            open: nav,
            high: nav,
            low: nav,
            close: nav,
            volume: Decimal::ZERO,
            nav: Some(nav),
            buy_price: None,
            sell_price: None,
            currency: "VND".to_string(),
        })
    }

    /// Fetch gold quote from SJC
    async fn fetch_gold_quote(&self, symbol: &str) -> Result<CachedQuote, VnMarketError> {
        let quote = self.sjc_client.get_latest_quote(symbol).await?;

        Ok(CachedQuote {
            symbol: quote.symbol,
            asset_type: VnAssetType::Gold,
            date: quote.date,
            open: quote.close,
            high: quote.close,
            low: quote.close,
            close: quote.close,
            volume: Decimal::ZERO,
            nav: None,
            buy_price: Some(quote.buy_price),
            sell_price: Some(quote.sell_price),
            currency: "VND".to_string(),
        })
    }

    /// Fetch stock/index history from VCI
    async fn fetch_stock_history(
        &self,
        symbol: &str,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<VnHistoricalRecord>, VnMarketError> {
        let quotes = self.vci_client.get_history(symbol, start, end).await?;

        Ok(quotes
            .into_iter()
            .map(|q| {
                VnHistoricalRecord::new(
                    &q.symbol,
                    VnAssetType::Stock,
                    q.timestamp.date_naive(),
                    q.open,
                    q.high,
                    q.low,
                    q.close,
                    Decimal::from(q.volume),
                )
            })
            .collect())
    }

    /// Fetch fund history from FMarket
    async fn fetch_fund_history(
        &self,
        symbol: &str,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<VnHistoricalRecord>, VnMarketError> {
        let fund_id = {
            let ids = self.fund_ids.read().await;
            ids.get(&symbol.to_uppercase())
                .copied()
                .ok_or_else(|| VnMarketError::FundNotFound(symbol.to_string()))?
        };

        let mut client = self.fmarket_client.write().await;
        let start_str = start.format("%Y-%m-%d").to_string();
        let end_str = end.format("%Y-%m-%d").to_string();
        let nav_records = client.get_nav_history(fund_id, &start_str, &end_str).await?;

        Ok(nav_records
            .into_iter()
            .filter_map(|r| {
                let date = NaiveDate::parse_from_str(&r.normalized_date(), "%Y-%m-%d").ok()?;
                let nav = Decimal::from_f64_retain(r.nav).unwrap_or_default();

                Some(
                    VnHistoricalRecord::new(
                        symbol,
                        VnAssetType::Fund,
                        date,
                        nav,
                        nav,
                        nav,
                        nav,
                        Decimal::ZERO,
                    )
                    .with_nav(nav),
                )
            })
            .collect())
    }

    /// Fetch gold history from SJC
    async fn fetch_gold_history(
        &self,
        symbol: &str,
        start: NaiveDate,
        end: NaiveDate,
    ) -> Result<Vec<VnHistoricalRecord>, VnMarketError> {
        let quotes = self.sjc_client.get_history(start, end).await?;

        Ok(quotes
            .into_iter()
            .map(|q| {
                VnHistoricalRecord::new(
                    symbol,
                    VnAssetType::Gold,
                    q.date,
                    q.close,
                    q.close,
                    q.close,
                    q.close,
                    Decimal::ZERO,
                )
                .with_gold_prices(q.buy_price, q.sell_price)
            })
            .collect())
    }

    /// Search for assets by query
    pub async fn search(&self, query: &str) -> Result<Vec<SearchResult>, VnMarketError> {
        let mut results = Vec::new();

        // Search stocks from VCI
        let symbols = self.vci_client.get_all_symbols().await?;
        let query_lower = query.to_lowercase();

        for symbol in symbols.iter().filter(|s| s.is_stock() && s.is_listed()) {
            let name_lower = symbol.display_name().to_lowercase();
            if symbol.symbol.to_lowercase().contains(&query_lower)
                || name_lower.contains(&query_lower)
            {
                results.push(SearchResult {
                    symbol: symbol.symbol.clone(),
                    name: symbol.display_name().to_string(),
                    asset_type: VnAssetType::Stock,
                    exchange: symbol.exchange().to_string(),
                });

                if results.len() >= 20 {
                    break;
                }
            }
        }

        // Search funds
        let client = self.fmarket_client.read().await;
        if let Ok(funds) = client.get_funds_listing().await {
            for fund in funds {
                if fund.short_name.to_lowercase().contains(&query_lower)
                    || fund.name.to_lowercase().contains(&query_lower)
                {
                    results.push(SearchResult {
                        symbol: fund.short_name,
                        name: fund.name,
                        asset_type: VnAssetType::Fund,
                        exchange: "FUND".to_string(),
                    });
                }
            }
        }

        // Add gold if query matches
        if query_lower.contains("gold") || query_lower.contains("vàng") || query_lower == "sjc" {
            results.push(SearchResult {
                symbol: "VN.GOLD".to_string(),
                name: "SJC Gold (Lượng)".to_string(),
                asset_type: VnAssetType::Gold,
                exchange: "SJC".to_string(),
            });
            results.push(SearchResult {
                symbol: "VN.GOLD.C".to_string(),
                name: "SJC Gold (Chỉ)".to_string(),
                asset_type: VnAssetType::Gold,
                exchange: "SJC".to_string(),
            });
        }

        Ok(results)
    }
}

impl Default for VnMarketService {
    fn default() -> Self {
        Self::new()
    }
}

/// Search result item
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub symbol: String,
    pub name: String,
    pub asset_type: VnAssetType,
    pub exchange: String,
}
