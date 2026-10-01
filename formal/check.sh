#!/usr/bin/env bash
set -euo pipefail

: "${TLA2TOOLS_JAR:?Set TLA2TOOLS_JAR to the path of tla2tools.jar (see formal/README.md)}"
# Resolve before cd so a relative jar path works too.
jar="$(cd "$(dirname "$TLA2TOOLS_JAR")" && pwd)/$(basename "$TLA2TOOLS_JAR")"
test -r "$jar"
cd "$(dirname "$0")"
if [ "$#" -eq 0 ]; then set -- GameSession Spell Client; fi
status=0
for model in "$@"; do
  # Keep TLC state files out of the source tree; retain counterexamples on stdout.
  work="$(mktemp -d)"
  echo "=== $model ==="
  java -XX:+UseParallelGC -cp "$jar" tlc2.TLC -workers 1 \
    -metadir "$work" -config "$model.cfg" "$model.tla" || status=1
  rm -rf "$work"
done
exit "$status"
