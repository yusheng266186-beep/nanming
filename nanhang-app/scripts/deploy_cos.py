#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把发布包上传到对象存储（COS），并配置匿名只读与跨域。

这是「数据更新」那条线：换一版发布包时重跑本脚本即可，前端不用重新发布——
前端只读 current.json 指针，换版本就是把指针指到新目录。

凭据只从环境变量读，不写进仓库：
    TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY
可选：
    NANHANG_COS_REGION   默认 ap-chengdu
    NANHANG_COS_BUCKET   默认 nanming-<APPID>
    NANHANG_COS_PREFIX   默认 data/releases

用法：
    python scripts/deploy_cos.py --dry-run     # 只列出要上传的文件
    python scripts/deploy_cos.py               # 创建桶（若缺）→ 配权限与跨域 → 上传
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RELEASE_DIR = REPO / "data" / "releases"


def credentials() -> tuple[str, str]:
    secret_id = os.environ.get("TENCENTCLOUD_SECRET_ID", "").strip()
    secret_key = os.environ.get("TENCENTCLOUD_SECRET_KEY", "").strip()
    if not secret_id or not secret_key:
        raise SystemExit("缺少凭据：请设置 TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY")
    return secret_id, secret_key


def app_id(secret_id: str, secret_key: str, region: str) -> str:
    from tencentcloud.common import credential as tc_credential
    from tencentcloud.sts.v20180813 import models, sts_client
    client = sts_client.StsClient(tc_credential.Credential(secret_id, secret_key), region)
    identity = client.GetCallerIdentity(models.GetCallerIdentityRequest())
    return str(identity.__dict__.get("_AccountId"))


def local_files() -> list[tuple[Path, str]]:
    """返回 (本地路径, 对象键) 列表；键保留 data/releases 下的相对结构。"""
    if not RELEASE_DIR.is_dir():
        raise SystemExit(f"找不到发布目录：{RELEASE_DIR}")
    files: list[tuple[Path, str]] = []
    for path in sorted(RELEASE_DIR.rglob("*")):
        if path.is_file():
            files.append((path, path.relative_to(RELEASE_DIR).as_posix()))
    return files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="只列出将上传的文件")
    parser.add_argument("--skip-upload", action="store_true", help="只建桶与配权限，不上传")
    args = parser.parse_args()

    files = local_files()
    total = sum(path.stat().st_size for path, _ in files)
    print(f"发布目录：{RELEASE_DIR}")
    print(f"文件数：{len(files)}，合计 {total / 1024 / 1024:.1f} MB")

    if args.dry_run:
        for path, key in files[:12]:
            print(f"  {key}  ({path.stat().st_size / 1024:.0f} KB)")
        if len(files) > 12:
            print(f"  …另有 {len(files) - 12} 个")
        return 0

    secret_id, secret_key = credentials()
    region = os.environ.get("NANHANG_COS_REGION", "ap-chengdu").strip() or "ap-chengdu"
    uid = app_id(secret_id, secret_key, region)
    bucket = os.environ.get("NANHANG_COS_BUCKET", f"nanming-{uid}").strip()
    prefix = os.environ.get("NANHANG_COS_PREFIX", "data/releases").strip().strip("/")
    print(f"账号 APPID：{uid}\n区域：{region}\n存储桶：{bucket}\n对象前缀：{prefix}/")

    from qcloud_cos import CosConfig, CosS3Client
    client = CosS3Client(CosConfig(Region=region, SecretId=secret_id, SecretKey=secret_key, Scheme="https"))

    existing = (client.list_buckets().get("Buckets") or {}).get("Bucket") or []
    names = {item.get("Name") for item in existing}
    if bucket in names:
        print("存储桶已存在，跳过创建")
    else:
        client.create_bucket(Bucket=bucket)
        print("已创建存储桶")

    # 匿名只读：只放行读对象，不放行列举（数据是公开的招生发布包，但没必要让人翻目录）。
    policy = {
        "version": "2.0",
        "Statement": [{
            "Principal": {"qcs": ["qcs::cam::anyone:anyone"]},
            "Effect": "Allow",
            "Action": ["cos:GetObject", "cos:HeadObject"],
            "Resource": [f"qcs::cos:{region}:uid/{uid}:{bucket}/*"],
        }],
    }
    client.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
    print("已配置匿名只读策略（仅 GetObject）")

    # 跨域：数据是公开只读的，允许任意来源读取即可——前端在 Pages 域名下，本地开发在 localhost。
    client.put_bucket_cors(Bucket=bucket, CORSConfiguration={
        "CORSRule": [{
            "AllowedOrigin": ["*"],
            "AllowedMethod": ["GET", "HEAD"],
            "AllowedHeader": ["*"],
            "ExposeHeader": ["ETag", "Content-Length", "x-cos-request-id"],
            "MaxAgeSeconds": 600,
        }],
    })
    print("已配置跨域（GET/HEAD，任意来源）")

    if args.skip_upload:
        return 0

    uploaded = 0
    for path, key in files:
        client.upload_file(Bucket=bucket, Key=f"{prefix}/{key}", LocalFilePath=str(path),
                           EnableMD5=False, progress_callback=None)
        uploaded += 1
        if uploaded % 20 == 0 or uploaded == len(files):
            print(f"  已上传 {uploaded}/{len(files)}")

    base = f"https://{bucket}.cos.{region}.myqcloud.com/{prefix}"
    print(f"\n完成。前端要用的取数地址：\n  VITE_NANHANG_RELEASE_BASE={base}")
    print(f"自检：{base}/current.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
