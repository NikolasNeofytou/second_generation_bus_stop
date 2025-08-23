CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS stops (
  stop_id TEXT PRIMARY KEY,
  stop_name TEXT,
  stop_lat DOUBLE PRECISION,
  stop_lon DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS routes (
  route_id TEXT PRIMARY KEY,
  route_short_name TEXT,
  route_long_name TEXT,
  route_type INTEGER
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  bearing DOUBLE PRECISION,
  timestamp BIGINT
);
