#!/bin/bash

#
# Load Testing Script
# Runs k6 load tests against the Learning Hub application
# Target: 100 concurrent students
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
RESULTS_DIR="tests/load/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="${RESULTS_DIR}/load-test-${TIMESTAMP}.json"

# Ensure results directory exists
mkdir -p "${RESULTS_DIR}"

# Print banner
echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Learning Hub - Load Testing Suite"
echo "  Target: 100 Concurrent Students"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Please install k6: https://k6.io/docs/get-started/installation/"
    echo ""
    echo "Quick install options:"
    echo "  macOS:   brew install k6"
    echo "  Linux:   sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6"
    echo "  Docker:  docker pull grafana/k6"
    exit 1
fi

# Parse command line arguments
SCENARIO=${1:-"steady_state"}
BASE_URL=${2:-"http://localhost:3000"}
AUTH_TOKEN=${3:-""}

echo "Configuration:"
echo "  Scenario:  ${SCENARIO}"
echo "  Base URL:  ${BASE_URL}"
echo "  Results:   ${RESULT_FILE}"
echo ""

# Scenario selection
case "${SCENARIO}" in
  "steady_state"|"steady")
    echo -e "${YELLOW}Running Steady State Test (100 concurrent users for 10 minutes)...${NC}"
    SCRIPT="tests/load/student-journey.js"
    ;;
  "ramp_up"|"ramp")
    echo -e "${YELLOW}Running Ramp-Up Test (0 → 100 users over 15 minutes)...${NC}"
    SCRIPT="tests/load/student-journey.js"
    export K6_SCENARIO="ramp_up"
    ;;
  "spike")
    echo -e "${YELLOW}Running Spike Test (sudden burst to 150 users)...${NC}"
    SCRIPT="tests/load/student-journey.js"
    export K6_SCENARIO="spike"
    ;;
  "soak")
    echo -e "${YELLOW}Running Soak Test (80 users for 30 minutes)...${NC}"
    SCRIPT="tests/load/student-journey.js"
    export K6_SCENARIO="soak"
    ;;
  "all")
    echo -e "${YELLOW}Running All Test Scenarios...${NC}"
    echo ""
    # Run all scenarios sequentially
    bash "$0" steady_state "${BASE_URL}" "${AUTH_TOKEN}"
    bash "$0" ramp_up "${BASE_URL}" "${AUTH_TOKEN}"
    bash "$0" spike "${BASE_URL}" "${AUTH_TOKEN}"
    echo -e "${GREEN}All scenarios completed!${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}Unknown scenario: ${SCENARIO}${NC}"
    echo "Available scenarios: steady_state, ramp_up, spike, soak, all"
    exit 1
    ;;
esac

# Export environment variables for k6
export BASE_URL
export AUTH_TOKEN

# Run k6 load test
echo ""
echo -e "${GREEN}Starting k6 load test...${NC}"
echo ""

k6 run \
  --out json="${RESULT_FILE}" \
  --summary-export="${RESULTS_DIR}/summary-${TIMESTAMP}.json" \
  "${SCRIPT}"

# Check test results
EXIT_CODE=$?

echo ""
if [ ${EXIT_CODE} -eq 0 ]; then
  echo -e "${GREEN}✓ Load test PASSED${NC}"
  echo "Results saved to: ${RESULT_FILE}"
else
  echo -e "${RED}✗ Load test FAILED${NC}"
  echo "Check results at: ${RESULT_FILE}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit ${EXIT_CODE}
