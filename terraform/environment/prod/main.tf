provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix = lower(replace(var.project_name, "/[^a-z0-9-]/", "-"))

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

module "s3" {
  source = "../../modules/s3"

  name_prefix = local.name_prefix
  tags        = local.tags
}

module "ec2" {
  source = "../../modules/ec2"

  name_prefix   = local.name_prefix
  instance_type = var.instance_type
  ssh_cidr      = var.ssh_cidr
  key_name      = var.key_name
  tags          = local.tags
}

module "cloudfront" {
  source = "../../modules/cloudfront"

  name_prefix                    = local.name_prefix
  s3_bucket_id                   = module.s3.bucket_id
  s3_bucket_arn                  = module.s3.bucket_arn
  s3_bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  ec2_public_dns                 = module.ec2.public_dns
  tags                           = local.tags
}
