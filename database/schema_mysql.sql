CREATE DATABASE IF NOT EXISTS omnisense_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE omnisense_ai;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'analyst', 'viewer') NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE workspaces (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  plan ENUM('demo', 'starter', 'growth', 'enterprise') NOT NULL DEFAULT 'demo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workspaces_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE data_sources (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  source_type ENUM('csv', 'facebook', 'email', 'app_store', 'amazon', 'api') NOT NULL,
  display_name VARCHAR(180) NOT NULL,
  status ENUM('active', 'paused', 'error') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sources_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE feedback_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NULL,
  external_id VARCHAR(255) NULL,
  author_name VARCHAR(180) NULL,
  rating DECIMAL(3, 2) NULL,
  content TEXT NOT NULL,
  received_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_feedback_source
    FOREIGN KEY (source_id) REFERENCES data_sources(id),
  INDEX idx_feedback_workspace_created (workspace_id, created_at),
  FULLTEXT INDEX ft_feedback_content (content)
);

CREATE TABLE analysis_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workspace_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NULL,
  status ENUM('queued', 'running', 'completed', 'failed') NOT NULL DEFAULT 'queued',
  total_items INT UNSIGNED NOT NULL DEFAULT 0,
  processed_items INT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  CONSTRAINT fk_jobs_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT fk_jobs_source
    FOREIGN KEY (source_id) REFERENCES data_sources(id)
);

CREATE TABLE analysis_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  feedback_id BIGINT UNSIGNED NOT NULL,
  job_id BIGINT UNSIGNED NULL,
  model_name VARCHAR(120) NOT NULL,
  sentiment ENUM('negative', 'neutral', 'positive') NOT NULL,
  sentiment_confidence DECIMAL(6, 5) NOT NULL,
  domain VARCHAR(80) NULL,
  domain_confidence DECIMAL(6, 5) NULL,
  language VARCHAR(16) NULL,
  language_confidence DECIMAL(6, 5) NULL,
  p_negative DECIMAL(6, 5) NOT NULL,
  p_neutral DECIMAL(6, 5) NOT NULL,
  p_positive DECIMAL(6, 5) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_feedback
    FOREIGN KEY (feedback_id) REFERENCES feedback_items(id),
  CONSTRAINT fk_results_job
    FOREIGN KEY (job_id) REFERENCES analysis_jobs(id),
  INDEX idx_results_sentiment_created (sentiment, created_at),
  INDEX idx_results_language (language),
  INDEX idx_results_domain (domain)
);
