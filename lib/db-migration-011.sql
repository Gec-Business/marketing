-- Migration 011: store visual_description on posts for editable DALL-E prompts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visual_description TEXT;
