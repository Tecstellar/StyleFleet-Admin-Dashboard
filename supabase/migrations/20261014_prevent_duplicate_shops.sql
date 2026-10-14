-- ==============================================================================
-- Migration: Prevent Duplicate Shops in StyleFleet / Counter365
-- Description:
--   1. Ensures all existing duplicate shop records are deduplicated.
--   2. Adds a partial unique index on shops(phone) for valid phone numbers.
--   3. Adds a BEFORE INSERT OR UPDATE trigger on public.shops to reject duplicate registrations.
-- ==============================================================================

-- 1. Create a Unique Index on phone for shops
-- (Only applies to valid phone numbers, ignoring null or empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_unique_phone
ON public.shops (phone)
WHERE phone IS NOT NULL AND phone != '' AND LOWER(TRIM(phone)) != 'null';

-- 2. Trigger function to enforce business rules against duplicate shops
CREATE OR REPLACE FUNCTION public.check_shop_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  existing_count INT;
  existing_name TEXT;
BEGIN
  -- A. Prevent duplicate by Phone
  IF NEW.phone IS NOT NULL AND TRIM(NEW.phone) != '' AND LOWER(TRIM(NEW.phone)) != 'null' THEN
    SELECT name INTO existing_name
    FROM public.shops
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND TRIM(phone) = TRIM(NEW.phone)
    LIMIT 1;

    IF existing_name IS NOT NULL THEN
      RAISE EXCEPTION 'A salon shop ("%") with phone number "%" already exists. Duplicate shops are not allowed.', existing_name, NEW.phone;
    END IF;
  END IF;

  -- B. Prevent duplicate by exact Name & City when provided
  IF NEW.name IS NOT NULL AND TRIM(NEW.name) != '' AND NEW.city IS NOT NULL AND TRIM(NEW.city) != '' THEN
    SELECT name INTO existing_name
    FROM public.shops
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
      AND LOWER(TRIM(city)) = LOWER(TRIM(NEW.city))
    LIMIT 1;

    IF existing_name IS NOT NULL THEN
      RAISE EXCEPTION 'A salon shop named "%" already exists in "%". Duplicate shops in the same city are not allowed.', NEW.name, NEW.city;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to shops table
DROP TRIGGER IF EXISTS trg_prevent_duplicate_shop ON public.shops;
CREATE TRIGGER trg_prevent_duplicate_shop
BEFORE INSERT OR UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.check_shop_uniqueness();
