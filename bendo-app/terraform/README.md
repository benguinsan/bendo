# AWS infrastructure (Terraform)

Optional starter stack: **S3** (private assets), **EC2** (Next.js origin), and **CloudFront** (CDN).

```text
Internet → CloudFront
              ├─ default (*)  → EC2 :80
              └─ /assets*     → S3 (Origin Access Control)
```

`dev` and `prod` are separate Terraform roots (separate state). They share `terraform/modules/*`. Applying **both** creates **two** billable stacks.

Local `npm run dev` does not require AWS.

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) `>= 1.5`
- AWS credentials via `aws configure` or `AWS_PROFILE` — **never commit keys**

## Apply (start with dev)

```bash
cp terraform/environment/dev/terraform.tfvars.example terraform/environment/dev/terraform.tfvars
npm run tf:init:dev
npm run tf:plan:dev
npm run tf:apply:dev
```

Prod is the same with `tf:*:prod` and `terraform/environment/prod`.

## Destroy

Run destroy in the **same** environment folder you applied:

```bash
npm run tf:destroy:dev
# npm run tf:destroy:prod
```

## Security notes

- S3 is private. Only CloudFront (OAC) can read objects.
- SSH (`22`) defaults to `0.0.0.0/0` for the starter. **Restrict `ssh_cidr`** in `terraform.tfvars` before using this in anything real.
- Do not commit `terraform.tfvars` or `*.tfstate`. Remote state (S3 + DynamoDB lock) is a later choice; this starter uses local state per environment.

## Variables

See `terraform.tfvars.example` in each environment. Typical values:

| Variable | Dev default | Prod default |
| --- | --- | --- |
| `instance_type` | `t3.micro` | `t3.small` |
| `environment` | `dev` | `prod` |
| `ssh_cidr` | `0.0.0.0/0` | `0.0.0.0/0` (restrict this) |
