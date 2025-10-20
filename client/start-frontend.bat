@echo off
echo === STARTING IPSCOPE FRONTEND ===
cd /d "%~dp0"
echo Current directory: %CD%
echo Starting frontend...
npm run dev
pause

