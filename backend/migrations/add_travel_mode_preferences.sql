`-- Migration: Add Travel Mode Preferences and Distance Limits
-- Date: 2026-02-20
-- Purpose: Add photographer control over travel mode preference, max distance, and improved accommodation logic

-- 1. Add new fields to photographer_travel_settings
ALTER TABLE photographer_travel_settings
ADD COLUMN IF NOT EXISTS travel_mode_preference text DEFAULT 'auto', -- 'auto', 'public_transport', 'personal_vehicle'
ADD COLUMN IF NOT EXISTS max_travel_distance_km numeric DEFAULT 500;

-- Add check constraint for valid travel modes
ALTER TABLE photographer_travel_settings
ADD CONSTRAINT travel_mode_check CHECK (travel_mode_preference IN ('auto', 'public_transport', 'personal_vehicle'));

-- 2. Add snapshot fields to booking table (if table exists and doesn't have these)
ALTER TABLE booking
ADD COLUMN IF NOT EXISTS travel_breakdown_json jsonb,
ADD COLUMN IF NOT EXISTS travel_calculated_at timestamptz,
ADD COLUMN IF NOT EXISTS travel_source_used text;

-- 3. Create index on photographer_travel_settings for faster lookups
CREATE INDEX IF NOT EXISTS idx_photographer_travel_mode 
ON photographer_travel_settings(travel_mode_preference);

CREATE INDEX IF NOT EXISTS idx_photographer_max_distance 
ON photographer_travel_settings(max_travel_distance_km);

-- Add comment for documentation
COMMENT ON COLUMN photographer_travel_settings.travel_mode_preference IS 'How photographer prefers travel costs calculated: auto (cheapest), public_transport (bus/train), personal_vehicle (per-km rate)';

COMMENT ON COLUMN photographer_travel_settings.max_travel_distance_km IS 'Maximum distance in km photographer is willing to travel. Requests beyond this will be rejected.';

COMMENT ON COLUMN booking.travel_breakdown_json IS 'Full travel cost breakdown snapshot at time of booking creation. Stored for audit trail and dispute resolution.';

COMMENT ON COLUMN booking.travel_calculated_at IS 'Timestamp when travel estimate was calculated and captured.';

COMMENT ON COLUMN booking.travel_source_used IS 'Source used for calculation: manual_bus_fare, google, osrm, local_matrix, haversine, default';
`