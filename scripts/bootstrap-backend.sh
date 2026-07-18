#!/usr/bin/env bash
# Bootstraps the Azure Storage backend used for Terraform remote state.
# Run once per environment, by a human with Owner/Contributor on the target
# subscription — this is intentionally NOT part of the CI pipeline, since
# it creates the very storage the pipeline's backend.hcl depends on.
#
# Usage:
#   ./scripts/bootstrap-backend.sh <environment> <subscription_id> <location>
# Example:
#   ./scripts/bootstrap-backend.sh dev 00000000-0000-0000-0000-000000000000 eastus

set -euo pipefail

ENVIRONMENT="${1:?Usage: $0 <environment> <subscription_id> <location>}"
SUBSCRIPTION_ID="${2:?Usage: $0 <environment> <subscription_id> <location>}"
LOCATION="${3:?Usage: $0 <environment> <subscription_id> <location>}"

RESOURCE_GROUP_NAME="rg-tfstate-mgmt-eus-01"
CONTAINER_NAME="tfstate"
STORAGE_ACCOUNT_NAME="sttfstate${ENVIRONMENT}$(openssl rand -hex 3)"

az account set --subscription "${SUBSCRIPTION_ID}"

az group create \
  --name "${RESOURCE_GROUP_NAME}" \
  --location "${LOCATION}" \
  --tags environment="${ENVIRONMENT}" owner=platform-team costCenter=CC-PLATFORM-001 application=terraform-state dataClassification=confidential

az storage account create \
  --name "${STORAGE_ACCOUNT_NAME}" \
  --resource-group "${RESOURCE_GROUP_NAME}" \
  --location "${LOCATION}" \
  --sku Standard_ZRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --https-only true

az storage container create \
  --name "${CONTAINER_NAME}" \
  --account-name "${STORAGE_ACCOUNT_NAME}" \
  --auth-mode login

echo "Backend storage account created: ${STORAGE_ACCOUNT_NAME}"
echo "Set this as TF_BACKEND_STORAGE_ACCOUNT in your CI variable group for ${ENVIRONMENT}."
