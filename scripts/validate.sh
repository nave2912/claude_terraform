#!/usr/bin/env bash
# Local pre-commit validation — mirrors the CI Validate stage.
# Usage: ./scripts/validate.sh <environment>   (default: dev)

set -euo pipefail

ENVIRONMENT="${1:-dev}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ROOT_DIR}/environments/${ENVIRONMENT}"

echo "== terraform fmt -check =="
terraform fmt -check -recursive "${ROOT_DIR}"

echo "== validating JSON models against schema =="
python3 "${ROOT_DIR}/tests/policy/validate_models.py"

echo "== terraform validate (${ENVIRONMENT}) =="
pushd "${ENV_DIR}" >/dev/null
terraform init -backend=false -input=false
terraform validate
popd >/dev/null

echo "== tflint =="
tflint --init --config="${ROOT_DIR}/.tflint.hcl"
tflint --config="${ROOT_DIR}/.tflint.hcl" --recursive "${ROOT_DIR}"

echo "== tfsec =="
tfsec "${ENV_DIR}" --config-file="${ROOT_DIR}/tfsec.yml" --minimum-severity HIGH

echo "== checkov =="
checkov --config-file "${ROOT_DIR}/.checkov.yaml" -d "${ENV_DIR}"

echo "== terraform test (module unit tests) =="
pushd "${ROOT_DIR}" >/dev/null
terraform test tests/unit/resource_group.tftest.hcl
popd >/dev/null

echo "All checks passed for environment: ${ENVIRONMENT}"
