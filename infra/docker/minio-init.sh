#!/bin/sh
set -eu

: "${MINIO_ROOT_USER:?MINIO_ROOT_USER requis}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD requis}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY requis}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY requis}"
: "${S3_BUCKET:?S3_BUCKET requis}"

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
mc mb --ignore-existing "local/$S3_BUCKET" >/dev/null
mc anonymous set none "local/$S3_BUCKET" >/dev/null
mc admin user add local "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null

policy_file="$(mktemp)"
trap 'rm -f "$policy_file"' EXIT
{
  printf '%s\n' '{'
  printf '%s\n' '  "Version": "2012-10-17",'
  printf '%s\n' '  "Statement": ['
  printf '%s\n' '    {'
  printf '%s\n' '      "Effect": "Allow",'
  printf '%s\n' '      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],'
  printf '      "Resource": ["arn:aws:s3:::%s"]\n' "$S3_BUCKET"
  printf '%s\n' '    },'
  printf '%s\n' '    {'
  printf '%s\n' '      "Effect": "Allow",'
  printf '%s\n' '      "Action": ['
  printf '%s\n' '        "s3:AbortMultipartUpload",'
  printf '%s\n' '        "s3:DeleteObject",'
  printf '%s\n' '        "s3:GetObject",'
  printf '%s\n' '        "s3:ListMultipartUploadParts",'
  printf '%s\n' '        "s3:PutObject"'
  printf '%s\n' '      ],'
  printf '      "Resource": ["arn:aws:s3:::%s/*"]\n' "$S3_BUCKET"
  printf '%s\n' '    }'
  printf '%s\n' '  ]'
  printf '%s\n' '}'
} >"$policy_file"

if ! mc admin policy info local cyberpass-evidence >/dev/null 2>&1; then
  mc admin policy create local cyberpass-evidence "$policy_file" >/dev/null
fi
mc admin policy attach local cyberpass-evidence --user "$S3_ACCESS_KEY" >/dev/null

printf 'Bucket privé et compte applicatif MinIO configurés.\n'
