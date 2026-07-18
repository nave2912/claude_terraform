#!/usr/bin/env python3
"""
Validates every models/<env>/<resource>.json file against its matching
models/schema/<resource>.schema.json. Run in CI before terraform plan so
malformed intent never reaches Terraform.

Usage: python tests/policy/validate_models.py
Requires: pip install jsonschema
"""
import json
import sys
from pathlib import Path

from jsonschema import Draft7Validator

ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = ROOT / "models" / "schema"
MODEL_DIRS = ["dev", "qa", "prod"]


def main() -> int:
    failures = 0
    checked = 0

    for env in MODEL_DIRS:
        env_dir = ROOT / "models" / env
        if not env_dir.exists():
            continue
        for model_file in sorted(env_dir.glob("*.json")):
            checked += 1
            schema_path = SCHEMA_DIR / f"{model_file.stem}.schema.json"
            if not schema_path.exists():
                failures += 1
                print(f"FAIL {model_file.relative_to(ROOT)}")
                print(f"  - no matching schema at {schema_path.relative_to(ROOT)}")
                continue

            schema = json.loads(schema_path.read_text())
            validator = Draft7Validator(schema)
            data = json.loads(model_file.read_text())
            errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
            if errors:
                failures += 1
                print(f"FAIL {model_file.relative_to(ROOT)}")
                for err in errors:
                    location = "/".join(str(p) for p in err.path) or "<root>"
                    print(f"  - {location}: {err.message}")
            else:
                print(f"OK   {model_file.relative_to(ROOT)}")

    print(f"\n{checked} model file(s) checked, {failures} failed.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
