output "instance_id" {
  description = "EC2 instance id."
  value       = aws_instance.app.id
}

output "public_dns" {
  description = "Public DNS name used as the CloudFront custom origin."
  value       = aws_instance.app.public_dns
}

output "public_ip" {
  description = "Public IPv4 address."
  value       = aws_instance.app.public_ip
}

output "security_group_id" {
  description = "Application security group id."
  value       = aws_security_group.app.id
}
