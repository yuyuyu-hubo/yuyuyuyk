@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 依次寻找可用的 Node.js：系统 PATH -> 常见安装目录 -> DSH 自带
set "NODE="
where node >nul 2>nul && set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE if exist "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" set "NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

if not defined NODE (
    echo.
    echo  [错误] 未检测到 Node.js 环境。
    echo.
    echo  请先安装 Node.js（免费）：
    echo    官网：https://nodejs.org/zh-cn
    echo    下载 LTS 长期支持版并安装即可。
    echo.
    echo  安装完成后，重新双击本文件即可启动网站。
    echo.
    pause
    exit /b 1
)

echo  正在启动「团子的秘密花园」网站 ...
echo  启动成功后请用浏览器打开： http://localhost:3000
echo  （按 Ctrl+C 或直接关闭本窗口即可停止网站）
echo.
"%NODE%" server.js
pause
