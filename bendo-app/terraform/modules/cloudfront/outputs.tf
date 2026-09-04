output "distribution_id" {
  description = "CloudFront distribution id."
  value       = aws_cloudfront_distribution.this.id
}

output "domain_name" {
  description = "CloudFront domain name (*.cloudfront.net)."
  value       = aws_cloudfront_distribution.this.domain_name
}

output "oac_id" {
  description = "Origin Access Control id."
  value       = aws_cloudfront_origin_access_control.s3.id
}
