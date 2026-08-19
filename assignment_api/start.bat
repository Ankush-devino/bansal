@echo off
echo ==========================================
echo   ForensicAI — Smart Case Assignment API
echo ==========================================
cd /d "%~dp0"
echo.
echo Installing dependencies...
pip install -r requirements.txt -q
echo.
echo Training / loading model...
echo Starting FastAPI on http://localhost:8001 ...
echo Swagger: http://localhost:8001/docs
echo.
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
