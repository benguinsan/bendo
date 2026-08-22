locals {
  # bucket_prefix max 37 characters; AWS appends a unique suffix.
  bucket_prefix = substr(
    lower(replace(var.name_prefix, "/[^a-z0-9-]/", "-")),
    0,
    30,
  )
}

resource "aws_s3_bucket" "assets" {
  bucket_prefix = "${local.bucket_prefix}-"
  force_destroy = var.force_destroy

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-assets"
  })
}

resource "aws_s3_bucket_ownership_controls" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
