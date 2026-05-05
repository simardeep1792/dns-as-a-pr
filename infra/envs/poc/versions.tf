terraform {
  required_version = ">= 1.6.0"

  backend "gcs" {
    bucket = "edip-aurora-fgc-tofu-state"
    prefix = "dns-as-a-pr/poc"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}
