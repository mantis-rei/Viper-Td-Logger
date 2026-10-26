@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ===================================================
echo        Viper Td Logger - GitHub Push Helper
echo ===================================================
echo.
echo Pushing branch 'main' to origin (https://github.com/mantis-rei/Viper-Td-Logger.git)...
echo If prompted, click 'Authorize' in the browser window to connect Git to GitHub.
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo [ERROR] Push failed. Please check the message above.
) else (
    echo.
    echo [SUCCESS] Viper Td Logger pushed to GitHub successfully!
)

echo.
pause
