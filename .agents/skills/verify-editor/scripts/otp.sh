#!/usr/bin/env bash
# Print the newest sign-in OTP Better Auth stored for EMAIL in the local Supabase DB.
# Usage: otp.sh dev@example.com
set -euo pipefail
EMAIL="${1:?usage: otp.sh <email>}"
docker exec supabase_db_grabbin psql -U postgres -tAc \
  "select split_part(value, ':', 1) from verification where identifier = 'sign-in-otp-$EMAIL' order by created_at desc limit 1"
