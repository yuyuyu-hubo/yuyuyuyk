@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 检查是否已获得管理员权限，没有则自动弹窗申请
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 需要管理员权限来开放防火墙，即将弹出授权窗口，请点“是”。
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo 正在开放局域网访问端口 3000 ...
netsh advfirewall firewall delete rule name="团子选款3000" >nul 2>&1
netsh advfirewall firewall add rule name="团子选款3000" dir=in action=allow protocol=TCP localport=3000 >nul

echo.
echo  已开放防火墙端口 3000（规则名：团子选款3000）
echo.
echo  本机 IPv4 地址如下（选“WLAN”或“以太网”那一行）：
powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }).IPAddress"
echo.
echo  手机访问地址格式： http://上面的IP地址:3000
echo.
echo  注意：手机必须和电脑连接【同一个 WiFi】。
echo.
pause
