#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把加密后的校内成绩分片上传到 COS 的 school/ 前缀。

上传的是 `scripts/export_school_cloud.mjs` 产出的密文：对象名是 HMAC(密钥, 分片名)，
内容是 AES-256-GCM。**桶本身仍然可以被匿名读到，但读到的是密文**，密钥只在函数环境变量里。
所以这个脚本不创建桶、也不改桶权限——沿用既有的只读策略即可。

凭据只从环境变量读：
    TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY
可选：
    NANHANG_COS_BUCKET   完整桶名（默认按 NANHANG_COS_BASE + NANHANG_COS_APPID 拼）
    NANHANG_COS_BASE     默认 nanming
    NANHANG_COS_APPID    账号 APPID（不是 UIN）
    NANHANG_COS_REGION   默认 ap-chengdu
    NANHANG_SCHOOL_PREFIX  默认 school

用法：
    python scripts/deploy_school_cloud.py --dry-run
    python scripts/deploy_school_cloud.py
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CLOUD_DIR = REPO / "data" / "quality-huixi" / "cloud"


def bucket_name() -> str:
    explicit = os.environ.get("NANHANG_COS_BUCKET", "").strip()
    if explicit:
        return explicit
    base = os.environ.get("NANHANG_COS_BASE", "nanming").strip() or "nanming"
    appid = os.environ.get("NANHANG_COS_APPID", "").strip()
    if not appid:
        raise SystemExit("缺少 NANHANG_COS_APPID（或直接给 NANHANG_COS_BUCKET）")
    return f"{base}-{appid}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    objects_dir = CLOUD_DIR / "objects"
    manifest = CLOUD_DIR / "manifest.json"
    if not objects_dir.is_dir() or not manifest.is_file():
        raise SystemExit("还没有密文产物：先跑 node scripts/export_school_cloud.mjs")
    files = sorted(objects_dir.glob("*.bin"))
    total = sum(item.stat().st_size for item in files)
    print(f"待上传：{len(files)} 个对象，{total / 1024 / 1024:.1f} MB")

    if args.dry_run:
        return 0

    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID", "").strip()
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY", "").strip()
    if not secret_id or not secret_key:
        raise SystemExit("缺少凭据：请设置 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY")
    region = os.environ.get("NANHANG_COS_REGION", "ap-chengdu").strip() or "ap-chengdu"
    prefix = os.environ.get("NANHANG_SCHOOL_PREFIX", "school").strip().strip("/") or "school"
    bucket = bucket_name()

    from qcloud_cos import CosConfig, CosS3Client

    client = CosS3Client(CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Scheme="https"))
    for index, path in enumerate(files, 1):
        client.upload_file(Bucket=bucket, Key=f"{prefix}/objects/{path.name}", LocalFilePath=str(path))
        if index % 100 == 0 or index == len(files):
            print(f"  已上传 {index}/{len(files)}")
    with open(manifest, "rb") as handle:
        client.put_object(Bucket=bucket, Key=f"{prefix}/manifest.json", Body=handle,
                          ContentType="application/json")
    print(f"完成：https://{bucket}.cos.{region}.myqcloud.com/{prefix}/objects/<对象名>")
    print("函数侧要配：NANHANG_SCHOOL_CLOUD_BASE = 上面的前缀地址（不带尾部斜杠），NANHANG_SCHOOL_KEY = private/school-cloud-key.txt 的内容")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
