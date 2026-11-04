-- A name counts on a board only for scores recorded after it was chosen (stops "name your luckiest of many tokens").
ALTER TABLE players ADD COLUMN named_at INTEGER;
UPDATE players SET named_at = created WHERE name IS NOT NULL;
