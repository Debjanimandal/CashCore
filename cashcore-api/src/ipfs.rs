use reqwest::Client;
use serde_json::{json, Value};
use crate::errors::{AppError, AppResult};

/// Pin a JSON object to IPFS via Pinata API
pub async fn pin_json(
    api_key: &str,
    secret_key: &str,
    content: &Value,
    name: &str,
) -> AppResult<String> {
    if api_key.is_empty() {
        // Dev mode: return a mock CID
        tracing::debug!("Pinata key not set — returning mock CID for {}", name);
        return Ok(format!("QmMOCKCID{:x}", name.len() * 12345));
    }

    let client = Client::new();
    let body = json!({
        "pinataMetadata": { "name": name },
        "pinataContent": content,
    });

    let res = client
        .post("https://api.pinata.cloud/pinning/pinJSONToIPFS")
        .header("pinata_api_key", api_key)
        .header("pinata_secret_api_key", secret_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Pinata request failed: {}", e)))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Pinata error: {}", err_text)));
    }

    let data: Value = res.json().await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let cid = data["IpfsHash"]
        .as_str()
        .ok_or_else(|| AppError::Internal("Pinata response missing IpfsHash".to_string()))?
        .to_string();

    tracing::info!("Pinned {} to IPFS: {}", name, cid);
    Ok(cid)
}

/// Fetch JSON content from IPFS via Pinata gateway
pub async fn fetch_json(gateway: &str, cid: &str) -> AppResult<Value> {
    let url = format!("{}/{}", gateway.trim_end_matches('/'), cid);
    let client = Client::new();

    let res = client.get(&url).send().await
        .map_err(|e| AppError::Internal(format!("IPFS fetch failed: {}", e)))?;

    let data: Value = res.json().await
        .map_err(|e| AppError::Internal(format!("IPFS JSON parse failed: {}", e)))?;

    Ok(data)
}
