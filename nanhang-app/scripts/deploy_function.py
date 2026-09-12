#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把打包好的 API 部署成腾讯云 SCF Web 函数。

先跑 `node scripts/build_function.mjs` 生成 apps/api/dist-scf/app.js，再跑本脚本。
凭据与密钥只从环境变量读，不写进仓库：

    TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY   必需
    QIANFAN_API_KEY                                    必需（真模型的钥匙）
    QIANFAN_MODEL                                      默认 qianfan-code-latest
    NANHANG_TRIAL_ACCESS_CODE                          必需（线上访问码；不要用仓库里的演示码）
    NANHANG_CORS_ORIGINS                               默认 https://yusheng266186-beep.github.io
    NANHANG_SCF_REGION / NANHANG_SCF_FUNCTION          默认 ap-chengdu / nanming-api
    NANHANG_AI_ALLOW_MEMORY_STORE                      默认 1（试用期单实例模式）

用法：
    python scripts/deploy_function.py --dry-run    # 只打包，不上传
    python scripts/deploy_function.py              # 打包 → 建或更新函数 → 打版本
"""
from __future__ import annotations

import argparse
import base64
import io
import os
import sys
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BUILD_DIR = REPO / "apps" / "api" / "dist-scf"
BOOTSTRAP = REPO / "apps" / "api" / "scf_bootstrap"

REQUIRED = ("TENCENTCLOUD_SECRET_ID", "TENCENTCLOUD_SECRET_KEY", "QIANFAN_API_KEY", "NANHANG_TRIAL_ACCESS_CODE")


def build_zip() -> bytes:
    """打一个 SCF 能直接跑的 zip：bootstrap（755 + LF）+ app.js + package.json。"""
    if not (BUILD_DIR / "app.js").is_file():
        raise SystemExit("还没打包：先运行 node scripts/build_function.mjs")
    if not BOOTSTRAP.is_file():
        raise SystemExit(f"找不到 {BOOTSTRAP}")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        # bootstrap 必须是 LF 换行 + 可执行位，否则平台起不来。
        bootstrap_zip = zipfile.ZipInfo("scf_bootstrap")
        bootstrap_zip.external_attr = (0o755 << 16) | 0o100000
        bootstrap_zip.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(bootstrap_zip, BOOTSTRAP.read_bytes().replace(b"\r\n", b"\n"))

        for name in ("app.js", "package.json"):
            data = (BUILD_DIR / name).read_bytes()
            info = zipfile.ZipInfo(name)
            info.external_attr = (0o644 << 16) | 0o100000
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    return buffer.getvalue()


def function_environment() -> dict[str, str]:
    """函数的环境变量。线上密钥只存在这里，不进仓库。"""
    return {
        "QIANFAN_API_KEY": os.environ["QIANFAN_API_KEY"].strip(),
        "QIANFAN_MODEL": os.environ.get("QIANFAN_MODEL", "qianfan-code-latest").strip(),
        "NANHANG_AI_UPSTREAM": "qianfan",
        "NANHANG_AI_PROFILE": "production",
        # 试用期的单实例内存档：函数重启后学生要重新兑换访问码。
        # 接上共享存储（Redis 等）后删掉这一项，生产档就会恢复正常要求。
        "NANHANG_AI_ALLOW_MEMORY_STORE": os.environ.get("NANHANG_AI_ALLOW_MEMORY_STORE", "1").strip(),
        "NANHANG_TRIAL_ACCESS_CODE": os.environ["NANHANG_TRIAL_ACCESS_CODE"].strip(),
        "NANHANG_CORS_ORIGINS": os.environ.get("NANHANG_CORS_ORIGINS", "https://yusheng266186-beep.github.io").strip(),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="只打包，不碰云端")
    args = parser.parse_args()

    payload = build_zip()
    # SDK 的 ZipFile 字段要 base64 字符串（不是原始字节），否则序列化时就报错。
    encoded = base64.b64encode(payload).decode()
    print(f"打包完成：{len(payload) / 1024:.0f} KB → base64 {len(encoded) / 1024:.0f} KB")
    if args.dry_run:
        return 0

    missing = [name for name in REQUIRED if not os.environ.get(name, "").strip()]
    if missing:
        raise SystemExit("缺少环境变量：" + "、".join(missing))

    from tencentcloud.common import credential as tc_credential
    from tencentcloud.scf.v20180416 import models, scf_client

    region = os.environ.get("NANHANG_SCF_REGION", "ap-chengdu").strip() or "ap-chengdu"
    function_name = os.environ.get("NANHANG_SCF_FUNCTION", "nanming-api").strip() or "nanming-api"
    client = scf_client.ScfClient(
        tc_credential.Credential(os.environ["TENCENTCLOUD_SECRET_ID"], os.environ["TENCENTCLOUD_SECRET_KEY"]), region)

    existing = {item.__dict__.get("_FunctionName") for item in
                (client.ListFunctions(models.ListFunctionsRequest()).Functions or [])}
    environment = models.Environment()
    variables = []
    for key, value in function_environment().items():
        variable = models.Variable()
        variable.Key = key
        variable.Value = value
        variables.append(variable)
    environment.Variables = variables

    import time

    def wait_active(label: str, timeout_s: int = 180) -> str:
        """等函数回到 Active。Creating/Updating 状态下发任何操作都会被平台拒绝。"""
        deadline = time.time() + timeout_s
        status = ""
        while time.time() < deadline:
            request = models.GetFunctionRequest()
            request.FunctionName = function_name
            status = str(client.GetFunction(request).__dict__.get("_Status") or "")
            if status == "Active":
                return status
            if status.endswith("Failed"):
                raise SystemExit(f"{label}：函数状态异常 {status}")
            time.sleep(4)
        raise SystemExit(f"{label}：等了 {timeout_s} 秒仍是 {status}")

    if function_name in existing:
        wait_active("更新前")
        print(f"函数已存在，更新代码：{function_name}")
        code = models.UpdateFunctionCodeRequest()
        code.FunctionName = function_name
        code.Handler = ""
        code.ZipFile = encoded
        client.UpdateFunctionCode(code)

        wait_active("更新代码后")
        print("更新环境变量与运行参数")
        config = models.UpdateFunctionConfigurationRequest()
        config.FunctionName = function_name
        config.Environment = environment
        config.Timeout = 300
        config.MemorySize = 256
        client.UpdateFunctionConfiguration(config)
    else:
        print(f"创建 Web 函数：{function_name}（Type=HTTP，Nodejs20.19）")
        request = models.CreateFunctionRequest()
        request.FunctionName = function_name
        request.Type = "HTTP"
        request.Runtime = "Nodejs20.19"
        request.Handler = ""
        request.MemorySize = 256
        # 深档一轮可能 25~50 秒，整轮上限 300 秒；函数超时不能比它短，否则会被平台掐断。
        request.Timeout = 300
        request.InitTimeout = 30
        request.Environment = environment
        code = models.Code()
        code.ZipFile = encoded
        request.Code = code
        client.CreateFunction(request)

    print("函数状态：", wait_active("部署后"))

    try:
        published = models.PublishVersionRequest()
        published.FunctionName = function_name
        published.Description = "南溟学生端 AI 中转"
        version = client.PublishVersion(published)
        print("已发布版本：", version.__dict__.get("_FunctionVersion"))
    except Exception as error:  # noqa: BLE001
        # 打版本不是上线必需（Web 函数的默认域名走 $LATEST），失败只提示不中断。
        print("打版本失败（不影响使用）：", str(error)[:120])

    print("\n环境变量（值不显示）：", "、".join(sorted(function_environment().keys())))
    print("下一步：在控制台打开该函数，复制「访问路径」填进仓库变量 NANHANG_API_BASE。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
