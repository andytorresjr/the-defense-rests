@echo off
rem Launches a local static server and opens the game.
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8123
  python -m http.server 8123
) else (
  start "" http://localhost:8123
  npx -y serve -l 8123 .
)
