output "s3_bucket_name" {
  description = "Private assets bucket name."
  value       = module.s3.bucket_id
}

output "ec2_public_dns" {
  description = "EC2 public DNS (CloudFront origin)."
  value       = module.ec2.public_dns
}

output "ec2_public_ip" {
  description = "EC2 public IPv4 address."
  value       = module.ec2.public_ip
}

output "cloudfront_domain_name" {
  description = "CloudFront domain (*.cloudfront.net)."
  value       = module.cloudfront.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id."
  value       = module.cloudfront.distribution_id
}
