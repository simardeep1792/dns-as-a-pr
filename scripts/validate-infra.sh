#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DATA_DIR="${TF_DATA_DIR:-$(mktemp -d)}"
export TF_DATA_DIR

tofu -chdir="$ROOT_DIR/infra" fmt -check -recursive
tofu -chdir="$ROOT_DIR/infra/envs/poc" init -backend=false
tofu -chdir="$ROOT_DIR/infra/envs/poc" validate
