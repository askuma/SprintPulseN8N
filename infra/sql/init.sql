-- SprintPulse database init: create n8n schema on same RDS instance
CREATE SCHEMA IF NOT EXISTS n8n_schema;
CREATE USER n8n WITH PASSWORD 'n8n_password';
GRANT ALL PRIVILEGES ON SCHEMA n8n_schema TO n8n;

-- Enum types are created by Drizzle migrations; this file handles infra-level setup only
