#!/bin/bash
set -e

SERVICE="gui/$(id -u)/com.nanoclaw"

case "${1:-}" in
  start)
    launchctl kickstart "$SERVICE" 2>/dev/null && echo "Started" || echo "Already running"
    ;;
  stop)
    launchctl kill SIGTERM "$SERVICE" 2>/dev/null && echo "Stopped" || echo "Not running"
    ;;
  restart)
    launchctl kickstart -k "$SERVICE" && echo "Restarted"
    ;;
  rebuild)
    cd "$(dirname "$0")"
    npm run build
    ./container/build.sh
    # Clear cached agent-runner so containers pick up changes
    find data/sessions -name "agent-runner-src" -type d -exec rm -rf {} + 2>/dev/null || true
    launchctl kickstart -k "$SERVICE" && echo "Rebuilt and restarted"
    ;;
  status)
    launchctl print "$SERVICE" 2>&1 | grep -E "state|pid" || echo "Not running"
    ;;
  logs)
    tail -f ~/Library/Logs/nanoclaw/nanoclaw.log 2>/dev/null || \
      tail -f "$(dirname "$0")"/groups/*/logs/container-*.log 2>/dev/null || \
      echo "No logs found"
    ;;
  *)
    echo "Usage: nanoclaw.sh {start|stop|restart|rebuild|status|logs}"
    ;;
esac
