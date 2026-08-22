output "bucket_id" {
  description = "S3 bucket name / id."
  value       = aws_s3_bucket.assets.id
}

output "bucket_arn" {
  description = "S3 bucket ARN."
  value       = aws_s3_bucket.assets.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name used as a CloudFront origin."
  value       = aws_s3_bucket.assets.bucket_regional_domain_name
}
