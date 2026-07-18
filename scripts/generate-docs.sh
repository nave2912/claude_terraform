#!/usr/bin/env bash
# Regenerates the Inputs/Outputs tables in each module README using terraform-docs.
# Requires: https://terraform-docs.io/ installed locally.
# Usage: ./scripts/generate-docs.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for module_dir in "${ROOT_DIR}"/modules/*/; do
  module_name="$(basename "${module_dir}")"
  [[ "${module_name}" == _module_template ]] && continue

  echo "Generating docs for module: ${module_name}"
  terraform-docs markdown table \
    --output-file README.md \
    --output-mode inject \
    "${module_dir}"
done

echo "Done. Review git diff before committing generated docs."
