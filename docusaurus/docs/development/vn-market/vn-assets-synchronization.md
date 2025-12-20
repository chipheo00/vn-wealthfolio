# VN Market Assets Synchronization

## Overview

The VN Market Assets Synchronization system provides comprehensive market data
integration for Vietnamese financial instruments. This feature enables
WealthVN to automatically fetch, cache, and synchronize asset information
from multiple Vietnamese market data providers.

## Architecture

### Data Providers

The system integrates with two primary Vietnamese market data providers:

1. **VCI (Vietnam Capital Investments)**
   - Provides stocks and indices data
   - Real-time market information
   - Comprehensive symbol listings

2. **FMarket**
   - Provides mutual funds data
   - Fund performance and pricing information
   - NAV (Net Asset Value) calculations

### Core Components

#### 1. Asset Models (`src-core/src/vn_market/assets_model.rs`)

```rust
pub struct VnAsset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub asset_type: String,
    pub exchange: String,
    pub currency: String,
    pub created_at: String,
    pub updated_at: String,
}
```

#### 2. Synchronization Service (`src-core/src/vn_market/assets_sync_service.rs`)

The `VnAssetsSyncService` handles:

- Fetching assets from multiple providers
- Data normalization and validation
- Bulk database operations
- Sync metadata tracking

#### 3. Repository Layer (`src-core/src/vn_market/assets_repository.rs`)

Provides database operations for:

- Asset CRUD operations
- Bulk upsert operations
- Query optimization

## Database Schema

### vn_assets Table

| Column     | Type | Description                    |
| ---------- | ---- | ------------------------------ |
| id         | TEXT | Primary key (symbol-timestamp) |
| symbol     | TEXT | Trading symbol                 |
| name       | TEXT | Full asset name                |
| asset_type | TEXT | Stock, Index, or Fund          |
| exchange   | TEXT | Exchange identifier            |
| currency   | TEXT | Trading currency (VND)         |
| created_at | TEXT | Creation timestamp             |
| updated_at | TEXT | Last update timestamp          |

### vn_assets_sync Table

Tracks synchronization metadata:

- Last sync timestamp
- Sync count
- Error tracking

## Usage

### Manual Synchronization

```typescript
// Trigger sync from frontend
import { syncVnAssets } from "@/commands/settings";

await syncVnAssets();
```

### Automatic Synchronization

The system supports automatic sync scheduling:

- Configurable sync intervals
- Error retry mechanisms
- Background processing

### Asset Types Supported

1. **Stocks**: Vietnamese company stocks
2. **Indices**: Market indices (VN30, HNX30, etc.)
3. **Funds**: Mutual funds and ETFs

## Configuration

### Environment Variables

```bash
# VCI API Configuration
VCI_API_BASE_URL=https://api.vci.vn
VCI_API_KEY=your_api_key

# FMarket Configuration
FMARKET_API_BASE_URL=https://fmarket.vn
FMARKET_API_KEY=your_api_key
```

### Sync Settings

```typescript
interface VnMarketSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  enableStocks: boolean;
  enableIndices: boolean;
  enableFunds: boolean;
}
```

## API Integration

### VCI Client

```rust
pub struct VciClient;

impl VciClient {
    pub async fn get_all_symbols(&self) -> Result<Vec<VciSymbol>>;
    pub async fn get_market_data(&self, symbol: &str) -> Result<MarketData>;
}
```

### FMarket Client

```rust
pub struct FMarketClient;

impl FMarketClient {
    pub async fn get_funds_listing(&self) -> Result<Vec<Fund>>;
    pub async fn get_fund_nav(&self, fund_id: &str) -> Result<NavData>;
}
```

## Performance Considerations

### Caching Strategy

- Local SQLite cache for fast lookups
- Configurable cache TTL
- Incremental sync updates

### Bulk Operations

- Batch database inserts
- Transaction management
- Error recovery mechanisms

### Rate Limiting

- Provider API rate limits
- Exponential backoff retry
- Concurrent request management

## Error Handling

### Common Error Scenarios

1. **API Unavailability**
   - Automatic retry with exponential backoff
   - Fallback to cached data
   - User notification system

2. **Data Validation Errors**
   - Schema validation
   - Data sanitization
   - Error logging and monitoring

3. **Database Connection Issues**
   - Connection pooling
   - Transaction rollback
   - Data consistency checks

## Monitoring and Logging

### Sync Metrics

- Total assets synced
- Sync duration
- Error rates
- Provider-specific statistics

### Log Levels

```rust
// Information logging
info!("Starting VN assets sync from VCI and FMarket...");

// Debug logging
debug!("Inserted {} stocks/indices", count);

// Warning logging
warn!("Failed to sync stocks: {}", e);
```

## Frontend Integration

### Settings UI

The market data settings page allows users to:

- Configure sync preferences
- View sync status
- Manual sync triggers
- Provider-specific settings

### Data Display

- Asset search and selection
- Real-time price updates
- Historical data visualization

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_vn_asset_creation() {
        let asset = NewVnAsset::new(
            "VNM".to_string(),
            "Vingroup Joint Stock Company".to_string(),
            "Stock".to_string(),
            "HOSE".to_string(),
        );

        assert_eq!(asset.symbol, "VNM");
        assert_eq!(asset.currency, "VND");
    }
}
```

### Integration Tests

- End-to-end sync workflows
- API client mocking
- Database transaction testing

## Future Enhancements

### Planned Features

1. **Real-time Streaming**: WebSocket connections for live price updates
2. **Additional Providers**: Integration with more Vietnamese data providers
3. **Advanced Analytics**: Technical indicators and market analysis tools
4. **Mobile Optimization**: Enhanced mobile app support

### Scalability Improvements

- Distributed caching
- Microservices architecture
- Load balancing

## Troubleshooting

### Common Issues

1. **Sync Failures**
   - Check API key configuration
   - Verify network connectivity
   - Review error logs

2. **Data Inconsistencies**
   - Run manual sync
   - Clear cache and resync
   - Validate data sources

3. **Performance Issues**
   - Optimize database queries
   - Adjust sync intervals
   - Monitor resource usage

### Support

For technical support and questions:

- Review the error logs in the application
- Check the GitHub issues page
- Contact the development team

## Security Considerations

### API Key Management

- Secure storage of API credentials
- Regular key rotation
- Access logging and monitoring

### Data Privacy

- Local data encryption
- User data anonymization
- Compliance with Vietnamese data protection regulations
