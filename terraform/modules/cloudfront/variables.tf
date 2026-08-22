variable "name_prefix" {
  description = "Lowercase prefix used in resource names and tags."
  type        = string
}

variable "s3_bucket_id" {
  description = "S3 bucket id (name) for the assets origin and bucket policy."
  type        = string
}

variable "s3_bucket_arn" {
  description = "S3 bucket ARN used in the OAC bucket policy."
  type        = string
}

variable "s3_bucket_regional_domain_name" {
  description = "S3 regional domain name for the CloudFront origin."
  type        = string
}

variable "ec2_public_dns" {
  description = "EC2 public DNS name for the default (Next.js) origin."
  type        = string
}

variable "tags" {
  description = "Tags applied to CloudFront resources."
  type        = map(string)
  default     = {}
}
