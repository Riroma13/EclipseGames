ALTER TABLE minigame_sessions ADD COLUMN prompt_revealed INTEGER NOT NULL DEFAULT 1 CHECK (prompt_revealed IN (0, 1));
