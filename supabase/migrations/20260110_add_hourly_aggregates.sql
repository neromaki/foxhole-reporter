-- Migration: Add pre-aggregated hourly ownership and casualty summary tables

-- Table 1: Territory Ownership Hourly Rollups
CREATE TABLE IF NOT EXISTS territory_ownership_hourly (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  territory_id TEXT NOT NULL,
  hex_region TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  hour_end TIMESTAMPTZ NOT NULL,
  owner TEXT NOT NULL,
  owner_changed_during_hour BOOLEAN DEFAULT false,
  icon_type INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (territory_id, hour_start)
);

CREATE INDEX IF NOT EXISTS idx_territory_time 
  ON territory_ownership_hourly (territory_id, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_hex_time 
  ON territory_ownership_hourly (hex_region, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_war_time 
  ON territory_ownership_hourly (war_number, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_owner_changed 
  ON territory_ownership_hourly (owner_changed_during_hour) WHERE owner_changed_during_hour = true;

ALTER TABLE territory_ownership_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" 
  ON territory_ownership_hourly FOR SELECT USING (true);
CREATE POLICY "Insert only for authenticated" 
  ON territory_ownership_hourly FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Table 2: Casualty Hourly Rollups
CREATE TABLE IF NOT EXISTS casualty_hourly (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  region TEXT NOT NULL,
  hour_start TIMESTAMPTZ NOT NULL,
  hour_end TIMESTAMPTZ NOT NULL,
  warden_casualties_delta INT DEFAULT 0,
  colonial_casualties_delta INT DEFAULT 0,
  warden_casualties_total INT DEFAULT 0,
  colonial_casualties_total INT DEFAULT 0,
  warden_rate_per_hour FLOAT DEFAULT 0,
  colonial_rate_per_hour FLOAT DEFAULT 0,
  day_of_war INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (region, hour_start)
);

CREATE INDEX IF NOT EXISTS idx_region_time 
  ON casualty_hourly (region, hour_start DESC);
CREATE INDEX IF NOT EXISTS idx_war_casualty_time 
  ON casualty_hourly (war_number, hour_start DESC);

ALTER TABLE casualty_hourly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" 
  ON casualty_hourly FOR SELECT USING (true);
CREATE POLICY "Insert only for authenticated" 
  ON casualty_hourly FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Table 3: Territory Lifecycle (Event Log)
CREATE TABLE IF NOT EXISTS territory_lifecycle (
  id BIGSERIAL PRIMARY KEY,
  war_number INT NOT NULL,
  territory_id TEXT NOT NULL,
  hex_region TEXT,
  previous_owner TEXT,
  new_owner TEXT,
  changed_at TIMESTAMPTZ NOT NULL,
  icon_type INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_territory_lifecycle 
  ON territory_lifecycle (territory_id);
CREATE INDEX IF NOT EXISTS idx_changed_at 
  ON territory_lifecycle (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_war_lifecycle 
  ON territory_lifecycle (war_number, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hex_lifecycle 
  ON territory_lifecycle (hex_region, changed_at DESC);

ALTER TABLE territory_lifecycle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read access for all" 
  ON territory_lifecycle FOR SELECT USING (true);
CREATE POLICY "Insert only for authenticated" 
  ON territory_lifecycle FOR INSERT WITH CHECK (auth.role() = 'authenticated');
