//! Transactional email over HTTPS (Resend free tier), sent inline in the
//! request. Replaces the entire Celery + Redis + RabbitMQ + SMTP layer, whose
//! main job was sending a few verification / reset emails in the background.
//!
//! When no `RESEND_API_KEY` is configured (local dev, tests) sending is a logged
//! no-op, so flows work end-to-end without network access.

use serde_json::json;

use crate::config::Config;

const RESEND_ENDPOINT: &str = "https://api.resend.com/emails";

/// Send a single transactional email. Errors are logged but not surfaced to the
/// caller: a failed email must not fail the surrounding request (the user can
/// re-request a verification/reset link). Returns whether a send was attempted.
pub async fn send(config: &Config, to: &str, subject: &str, body: &str) -> bool {
    let Some(api_key) = config.resend_api_key.as_deref() else {
        tracing::info!(%to, %subject, "email send skipped (no RESEND_API_KEY); body: {body}");
        return false;
    };

    let payload = json!({
        "from": config.email_from,
        "to": [to],
        "subject": subject,
        "text": body,
    });

    let result = reqwest::Client::new()
        .post(RESEND_ENDPOINT)
        .bearer_auth(api_key)
        .json(&payload)
        .send()
        .await;

    match result {
        Ok(resp) if resp.status().is_success() => true,
        Ok(resp) => {
            tracing::error!(status = %resp.status(), %to, "resend rejected email");
            false
        }
        Err(err) => {
            tracing::error!(error = %err, %to, "resend request failed");
            false
        }
    }
}

/// Build + send the email-verification link.
pub async fn send_verification(config: &Config, to: &str, token: &str) -> bool {
    let link = format!("{}/account/verify_email/{token}", config.frontend_base_url);
    send(
        config,
        to,
        "Verify your email",
        &format!("Use this link to verify your email: {link}"),
    )
    .await
}

/// Build + send the password-reset link.
pub async fn send_password_reset(config: &Config, to: &str, token: &str) -> bool {
    let link = format!(
        "{}/account/reset-password/{token}",
        config.frontend_base_url
    );
    send(
        config,
        to,
        "Reset your password",
        &format!("Use this link to reset your password: {link}"),
    )
    .await
}
