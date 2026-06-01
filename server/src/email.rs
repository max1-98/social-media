//! Transactional email over HTTPS (Resend/Brevo free tier), sent inline in the
//! request. Replaces the entire Celery + Redis + RabbitMQ + SMTP layer, whose
//! main job was sending a few verification / reset emails in the background.
