-- SprintPulse database init: run by postgres on first container start
-- Creates the n8n user and dedicated n8n database

CREATE USER n8n WITH PASSWORD 'n8n_password';
CREATE DATABASE n8n OWNER n8n;
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n;
