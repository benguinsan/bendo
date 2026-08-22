variable "name_prefix" {
  description = "Lowercase prefix used in resource names and tags."
  type        = string
}

variable "tags" {
  description = "Tags applied to S3 resources."
  type        = map(string)
  default     = {}
}

variable "force_destroy" {
  description = "Allow terraform destroy to delete a non-empty bucket (starter default)."
  type        = bool
  default     = true
}
