variable "name_prefix" {
  description = "Lowercase prefix used in resource names and tags."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (port 22). Restrict this in real use; 0.0.0.0/0 is a starter default only."
  type        = string
  default     = "0.0.0.0/0"
}

variable "key_name" {
  description = "Optional EC2 key pair name. Leave null to create the instance without SSH keys."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags applied to EC2 resources."
  type        = map(string)
  default     = {}
}
