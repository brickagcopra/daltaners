#!/bin/bash
# =============================================================================
# Daltaners Platform — Seed Data Runner
# Seeds PostgreSQL and CassandraDB with test data
# Usage: bash docker/seed-data.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================="
echo "  Daltaners — Seed Data Runner"
echo "============================================="
echo ""

# ─── Check containers are running ───
echo -e "${YELLOW}[1/4] Checking containers...${NC}"

if ! docker ps --format '{{.Names}}' | grep -q 'daltaners-postgres'; then
  echo -e "${RED}ERROR: daltaners-postgres is not running.${NC}"
  echo "  Run: docker compose up -d"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q 'daltaners-cassandra'; then
  echo -e "${RED}ERROR: daltaners-cassandra is not running.${NC}"
  echo "  Run: docker compose up -d"
  exit 1
fi

echo -e "${GREEN}  All required containers are running.${NC}"
echo ""

# ─── Wait for PostgreSQL to be ready ───
echo -e "${YELLOW}[2/4] Waiting for PostgreSQL to be ready...${NC}"
RETRIES=30
until docker exec daltaners-postgres pg_isready -U daltaners -d daltaners -q 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo -e "${RED}ERROR: PostgreSQL did not become ready in time.${NC}"
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}  PostgreSQL is ready.${NC}"
echo ""

# ─── Seed PostgreSQL ───
echo -e "${YELLOW}[3/4] Seeding PostgreSQL...${NC}"
docker cp "${SCRIPT_DIR}/seed-postgres.sql" daltaners-postgres:/tmp/seed-postgres.sql
MSYS_NO_PATHCONV=1 docker exec daltaners-postgres psql -U daltaners -d daltaners -f /tmp/seed-postgres.sql

if [ $? -eq 0 ]; then
  echo -e "${GREEN}  PostgreSQL seeded successfully!${NC}"
else
  echo -e "${RED}  PostgreSQL seeding FAILED. Check errors above.${NC}"
  exit 1
fi
echo ""

# ─── Wait for Cassandra to be ready ───
echo -e "${YELLOW}[4/4] Seeding CassandraDB...${NC}"
echo "  Waiting for Cassandra to accept connections..."
RETRIES=60
until docker exec daltaners-cassandra cqlsh -e "DESCRIBE KEYSPACES;" >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    echo -e "${RED}ERROR: Cassandra did not become ready in time.${NC}"
    exit 1
  fi
  sleep 2
done

# Run init script first (Cassandra doesn't auto-run entrypoint-initdb.d files)
echo "  Ensuring keyspace and tables exist..."
docker cp "${SCRIPT_DIR}/init-cassandra.cql" daltaners-cassandra:/tmp/init-cassandra.cql
MSYS_NO_PATHCONV=1 docker exec daltaners-cassandra cqlsh -f /tmp/init-cassandra.cql

docker cp "${SCRIPT_DIR}/seed-cassandra.cql" daltaners-cassandra:/tmp/seed-cassandra.cql
MSYS_NO_PATHCONV=1 docker exec daltaners-cassandra cqlsh -f /tmp/seed-cassandra.cql

if [ $? -eq 0 ]; then
  echo -e "${GREEN}  CassandraDB seeded successfully!${NC}"
else
  echo -e "${RED}  CassandraDB seeding FAILED. Check errors above.${NC}"
  exit 1
fi

echo ""
echo "============================================="
echo -e "${GREEN}  All seed data loaded successfully!${NC}"
echo "============================================="
echo ""
echo "Test accounts (password for all: Test@12345):"
echo "  Admin:     admin@daltaners.ph"
echo "  Customer:  maria.santos@gmail.com"
echo "  Customer:  juan.delacruz@gmail.com"
echo "  Customer:  anna.reyes@gmail.com"
echo "  Vendor:    vendor_grocery@daltaners.ph    (Tindahan ni Aling Nena)"
echo "  Vendor:    vendor_restaurant@daltaners.ph (Kusina de Manila)"
echo "  Vendor:    vendor_pharmacy@daltaners.ph   (Botica ng Bayan)"
echo "  Vendor:    vendor_electronics@daltaners.ph(TechMart PH)"
echo "  Rider:     rider_mark@daltaners.ph"
echo "  Rider:     rider_james@daltaners.ph"
echo "  Rider:     rider_carlo@daltaners.ph"
echo ""
echo "Sample orders:"
echo "  DLT-20260228-001  Delivered  (Grocery, GCash)"
echo "  DLT-20260228-002  In Transit (Restaurant, Maya)"
echo "  DLT-20260228-003  Pending    (Pharmacy, COD)"
echo "  DLT-20260227-001  Cancelled  (Grocery, Refunded)"
echo "  DLT-20260228-004  Preparing  (Restaurant, Pickup)"
echo "  DLT-20260228-005  Confirmed  (Electronics, Card)"
echo ""
