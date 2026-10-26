@echo off
setlocal EnableExtensions

REM Relaunch this script with Administrator privileges if needed.
net session >nul 2>&1
if errorlevel 1 (
    echo Requesting Administrator permission...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

title Viper TD Logger - Launcher

REM Always run from the folder where this BAT file is located.
cd /d "%~dp0"

set "APP_URL=http://localhost:3000/"
set "PORT=3000"

echo.
echo ==========================================
echo        Viper TD Logger - Launcher
echo ==========================================
echo.

REM Verify Node.js and npm are installed.
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found.
    echo Install the LTS version from https://nodejs.org/
    echo Then reopen this file.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm was not found. Reinstall Node.js LTS.
    pause
    exit /b 1
)

REM Verify this is the project folder.
if not exist "package.json" (
    echo ERROR: package.json was not found in:
    echo %CD%
    echo.
    echo Put this BAT file in the project's root folder,
    echo beside package.json, then run it again.
    pause
    exit /b 1
)

REM Install dependencies only if they are missing.
if not exist "node_modules\" (
    echo Dependencies are missing. Running npm install...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

REM If the app is already responding on this port, open it instead
REM of starting a second development server.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
    echo The app is already responding at %APP_URL%
    start "" "%APP_URL%"
    exit /b 0
)

echo Starting the Vite development server...
echo The browser will open at %APP_URL%
echo Keep this window open while using the app.
echo Press Ctrl+C in this window to stop the server.
echo.

REM Start the browser shortly after the server process begins.
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process '%APP_URL%'"

REM Keep the server attached to this window so logs and errors remain visible.
call npm run dev -- --host 0.0.0.0 --port %PORT% --strictPort

echo.
echo The development server has stopped.
pause
