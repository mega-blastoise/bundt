//! The Rust protocol types agree with the JSON Schema published by
//! `@bundt/waavy` (`dist/protocol.schema.json`, generated from the
//! TypeScript source of truth).
//!
//! Uses `WAAVY_PROTOCOL_SCHEMA` if set, else the monorepo's built package.
//! Skips (with a message) when neither exists, e.g. before `bun run build`.

use std::path::PathBuf;
use std::time::Duration;

use serde_json::{json, Value};
use waavy::{ErrorCode, RenderRequest};

fn load_schema() -> Option<Value> {
    let path = std::env::var_os("WAAVY_PROTOCOL_SCHEMA").map(PathBuf::from).unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/waavy/dist/protocol.schema.json")
    });
    match std::fs::read_to_string(&path) {
        Ok(text) => Some(serde_json::from_str(&text).expect("schema is valid JSON")),
        Err(_) => {
            eprintln!("skipping: {} not found (run `bun run build` in packages/waavy)", path.display());
            None
        }
    }
}

#[test]
fn serialized_requests_validate_against_the_schema() {
    let Some(schema) = load_schema() else { return };
    let validator = jsonschema::validator_for(&schema["$defs"]["RenderRequest"]).expect("schema compiles");

    let samples = [
        RenderRequest::new("home"),
        RenderRequest::new("account/settings")
            .props(json!({ "nested": { "list": [1, "two", null, true] } }))
            .title("T")
            .lang("en-GB")
            .head("<meta name=\"x\">")
            .timeout(Duration::from_millis(500)),
    ];
    for sample in samples {
        let instance = serde_json::to_value(&sample).unwrap();
        assert!(validator.is_valid(&instance), "{instance} should satisfy the schema");
    }

    // And the schema really is strict: it rejects what waavy would reject.
    assert!(!validator.is_valid(&json!({ "v": 1, "page": "Bad Page" })));
    assert!(!validator.is_valid(&json!({ "v": 1, "page": "home", "unknown": true })));
}

#[test]
fn error_codes_match_the_schema() {
    let Some(schema) = load_schema() else { return };
    let codes: Vec<&str> = schema["$defs"]["ErrorBody"]["properties"]["error"]["properties"]["code"]["enum"]
        .as_array()
        .expect("code enum")
        .iter()
        .map(|code| code.as_str().unwrap())
        .collect();
    let known: Vec<&str> = ErrorCode::KNOWN.iter().map(ErrorCode::as_str).collect();
    assert_eq!(known, codes);
}
