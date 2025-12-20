//! VN Assets Market Reference Data Models

use diesel::prelude::*;

use crate::schema::vn_assets;

/// Asset from the vn_assets cache table (market reference data)
#[derive(Debug, Clone, Queryable)]
pub struct VnAsset {
    pub id: Option<String>,
    pub symbol: String,
    pub name: String,
    pub asset_type: String,
    pub exchange: String,
    pub currency: String,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
}

/// New VN asset to be inserted
#[derive(Debug, Clone, Insertable)]
#[diesel(table_name = vn_assets)]
pub struct NewVnAsset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub asset_type: String,
    pub exchange: String,
    pub currency: String,
}

impl NewVnAsset {
    pub fn new(
        symbol: String,
        name: String,
        asset_type: String,
        exchange: String,
    ) -> Self {
        let id = format!("{}-{}", symbol, chrono::Utc::now().timestamp_millis());
        Self {
            id,
            symbol,
            name,
            asset_type,
            exchange,
            currency: "VND".to_string(),
        }
    }
}
