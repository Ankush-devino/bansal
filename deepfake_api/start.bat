@echo off
echo ==========================================
echo   Deepfake Detection API — FastAPI Server
echo ==========================================

cd /d "%~dp0"

echo.
echo Checking model checkpoint...
if not exist "model\deepfake_efficientnet.pth" (
    echo.
    echo [!] Model not trained yet. Running dataset download + training first...
    echo     This may take 20-40 minutes on CPU.
    echo.
    python download_dataset.py
    python train.py
)

echo.
echo Starting FastAPI on http://localhost:8000 ...
echo Swagger docs: http://localhost:8000/docs
echo.
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
