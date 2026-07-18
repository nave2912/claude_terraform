ENVIRONMENT ?= dev

.PHONY: fmt validate-models init validate lint security-scan test validate-all plan apply

fmt:
	terraform fmt -recursive .

validate-models:
	python3 tests/policy/validate_models.py

init:
	cd environments/$(ENVIRONMENT) && terraform init -backend=false -input=false

validate: init
	cd environments/$(ENVIRONMENT) && terraform validate

lint:
	tflint --init --config=.tflint.hcl
	tflint --config=.tflint.hcl --recursive .

security-scan:
	tfsec environments/$(ENVIRONMENT) --config-file=tfsec.yml --minimum-severity HIGH
	checkov --config-file .checkov.yaml -d environments/$(ENVIRONMENT)

test:
	terraform test tests/unit/resource_group.tftest.hcl

validate-all: fmt validate-models validate lint security-scan test

plan:
	cd environments/$(ENVIRONMENT) && terraform plan -var-file=terraform.tfvars

apply:
	cd environments/$(ENVIRONMENT) && terraform apply -var-file=terraform.tfvars
