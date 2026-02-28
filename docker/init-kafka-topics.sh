#!/bin/bash
# =============================================================================
# Daltaners Platform — Kafka Topic Initialization Script
# Creates all required topics with specified partitions and replication factor.
# Intended to be run against a running Kafka broker.
# =============================================================================

set -e

KAFKA_BOOTSTRAP_SERVER="${KAFKA_BOOTSTRAP_SERVER:-localhost:9092}"
MAX_RETRIES=30
RETRY_INTERVAL=5

echo "============================================="
echo " Daltaners — Kafka Topic Initialization"
echo "============================================="
echo "Bootstrap server: ${KAFKA_BOOTSTRAP_SERVER}"
echo ""

# Wait for Kafka to be ready
echo "Waiting for Kafka broker to be ready..."
for i in $(seq 1 $MAX_RETRIES); do
  if kafka-broker-api-versions --bootstrap-server "${KAFKA_BOOTSTRAP_SERVER}" > /dev/null 2>&1; then
    echo "Kafka broker is ready."
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "ERROR: Kafka broker did not become ready within $(( MAX_RETRIES * RETRY_INTERVAL )) seconds."
    exit 1
  fi
  echo "  Attempt ${i}/${MAX_RETRIES} — broker not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo ""
echo "Creating Kafka topics..."
echo "---------------------------------------------"

# Function to create a topic idempotently
create_topic() {
  local topic_name="$1"
  local partitions="$2"
  local replication_factor="$3"

  echo -n "  Creating topic: ${topic_name} (partitions=${partitions}, RF=${replication_factor}) ... "

  kafka-topics --bootstrap-server "${KAFKA_BOOTSTRAP_SERVER}" \
    --create \
    --if-not-exists \
    --topic "${topic_name}" \
    --partitions "${partitions}" \
    --replication-factor "${replication_factor}"

  echo "OK"
}

# ─── Order Domain ────────────────────────────────
create_topic "daltaners.orders.events"          6 1
create_topic "daltaners.orders.status"          6 1

# ─── Payment Domain ─────────────────────────────
create_topic "daltaners.payments.events"        3 1

# ─── Inventory Domain ───────────────────────────
create_topic "daltaners.inventory.events"       3 1

# ─── Delivery Domain ────────────────────────────
create_topic "daltaners.delivery.tracking"      6 1
create_topic "daltaners.delivery.assignments"   3 1

# ─── Notification Domain ────────────────────────
create_topic "daltaners.notifications.outbound" 3 1

# ─── User Domain ────────────────────────────────
create_topic "daltaners.users.events"           3 1

echo ""
echo "---------------------------------------------"
echo "All topics created successfully."
echo ""

# List all topics for verification
echo "Verifying — listing all topics:"
kafka-topics --bootstrap-server "${KAFKA_BOOTSTRAP_SERVER}" --list

echo ""
echo "============================================="
echo " Kafka topic initialization complete."
echo "============================================="
