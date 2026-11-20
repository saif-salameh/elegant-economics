@echo off
cd /d "%~dp0"
python -m flask --app backend.app run
