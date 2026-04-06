-- Seed default users
-- Admin password: gec-admin-2026
-- Operator (Tea) password: tea-operator-2026

-- These hashes are bcrypt with 12 rounds
-- You MUST regenerate these in production

INSERT INTO users (email, password_hash, name, role) VALUES
('admin@gecbusiness.com', '$2a$12$LJ3m4ys3uz2pFMBEZemjguJBLFaGq7VtVY2cJeHQ6P5gM8dSJNSNi', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, name, role) VALUES
('tea@gecbusiness.com', '$2a$12$vZ9RlqN6S3KcU0K5V5Xt6e8r7tnRPJpAqxsxYY0lDfJDBJ6q7q2wu', 'Tea', 'operator')
ON CONFLICT (email) DO NOTHING;
