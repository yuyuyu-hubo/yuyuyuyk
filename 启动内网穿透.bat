@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem ---------- 找 Node ----------
set "NODE="
where node >nul 2>nul && set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE if exist "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" set "NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

rem ---------- 找 cpolar ----------
set "CPOLAR="
where cpolar >nul 2>nul && set "CPOLAR=cpolar"
if not defined CPOLAR if exist "%ProgramFiles%\cpolar\cpolar.exe" set "CPOLAR=%ProgramFiles%\cpolar\cpolar.exe"
if not defined CPOLAR if exist "%ProgramFiles(x86)%\cpolar\cpolar.exe" set "CPOLAR=%ProgramFiles(x86)%\cpolar\cpolar.exe"
if not defined CPOLAR if exist "%USERPROFILE%\cpolar\cpolar.exe" set "CPOLAR=%USERPROFILE%\cpolar\cpolar.exe"
if not defined CPOLAR if exist "%LOCALAPPDATA%\cpolar\cpolar.exe" set "CPOLAR=%LOCALAPPDATA%\cpolar\cpolar.exe"

if not defined NODE (
    echo [错误] 未找到 Node.js，请先安装：https://nodejs.org/zh-cn
    pause
    exit /b 1
)
if not defined CPOLAR (
    echo.
    echo [错误] 未找到 cpolar 客户端。
    echo  1) 到 https://www.cpolar.com 注册并下载安装 cpolar
    echo  2) 安装后打开命令行，运行一次：  cpolar authtoken 你的token
    echo  3) 再重新双击本文件。
    echo.
    pause
    exit /b 1
)

rem ---------- 启动网站（新窗口） ----------
start "团子的秘密花园-网站" "%NODE%" server.js

rem ---------- 启动隧道（本窗口，显示公网地址） ----------
echo.
echo  正在启动 cpolar 隧道，几秒后下方会出现一个 https 开头的公网地址 ...
echo  把它发给顾客即可。窗口别关，关了网站就打不开了。
echo.
"%CPOLAR%" http 3000
pause
