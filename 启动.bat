@echo off
REM ============================================================
REM  个人主页启动脚本（Windows）
REM  作用：从系统环境变量读取密钥并启动服务
REM  用法：双击本文件即可
REM ============================================================

cd /d "%~dp0"

echo.
echo   ============================================
echo     史航菲 · 个人主页
echo   ============================================
echo.

set MISSING=0

REM 检查环境变量是否已配置（只判断是否存在，不显示内容）
if "%REPLICATE_API_TOKEN%"=="" (
  echo   [警告] 未检测到 REPLICATE_API_TOKEN，抠图功能将不可用
  echo          配置命令：setx REPLICATE_API_TOKEN "你的Token"
  echo.
  set MISSING=1
) else (
  echo   [OK] 已读取 REPLICATE_API_TOKEN（抠图）
)

if "%OPENROUTER_API_KEY%"=="" (
  echo   [警告] 未检测到 OPENROUTER_API_KEY，文生图功能将不可用
  echo          配置命令：setx OPENROUTER_API_KEY "你的Key"
  echo.
  set MISSING=1
) else (
  echo   [OK] 已读取 OPENROUTER_API_KEY（文生图）
)

if "%MISSING%"=="1" (
  echo.
  echo   提示：setx 配置后需要关闭本窗口重新打开才会生效。
  echo.
)

echo   正在启动服务...
echo.

node server.js

pause
