@echo off
echo =============================================
echo   ForensicAI - Multi-Modal Biometric API
echo =============================================
cd /d "%~dp0"
echo.
echo Installing dependencies...
pip install -r requirements.txt -q
echo.
echo Starting Biometric API on http://localhost:8002 ...
echo Swagger docs: http://localhost:8002/docs
echo.
echo Modalities: Fingerprint, DNA, Iris, Face, Voice
echo Suspect DB: 15 Indian suspects
echo.
uvicorn app:app --host 0.0.0.0 --port 8002 --reload
