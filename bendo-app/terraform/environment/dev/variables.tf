variable "aws_region" {
  description = "AWS region for this environment."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used in resource names (include the env suffix)."
  type        = string
  default     = "bendo-dev"
}

variable "environment" {
  description = "Environment name used in tags."
  type        = string
  default     = "dev"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (port 22). Restrict this in real use."
  type        = string
  default     = "0.0.0.0/0"
}

variable "key_name" {
  description = "Optional EC2 key pair name."
  type        = string
  default     = null
}
