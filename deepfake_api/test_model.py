"""
Quick test: what does the pipeline actually output?
Run: python deepfake_api/test_model.py
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
import io

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Create a simple test fake image (solid colour – not a real face, so model should NOT be confident "REAL")
def make_test_image(colour=(200, 100, 100), text="TEST"):
    img = Image.new("RGB", (224, 224), colour)
    return img

print("Loading pipeline...")
from transformers import pipeline
pipe = pipeline("image-classification", model="dima806/deepfake_vs_real_image_detection", device=-1)

img = make_test_image()
results = pipe(img)
print("\n=== Raw pipeline output ===")
for r in results:
    print(f"  label={r['label']!r}  score={r['score']:.4f}")

print("\n=== All id2label from model config ===")
model_obj = pipe.model
print(dict(model_obj.config.id2label))
