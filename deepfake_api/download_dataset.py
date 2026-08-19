"""
download_dataset.py

Downloads a balanced deepfake detection dataset from Kaggle and organises it
into:
  data/train/real/   ~5 000 images
  data/train/fake/   ~5 000 images
  data/val/real/     ~1 000 images
  data/val/fake/     ~1 000 images

Dataset used: 140k-real-and-fake-faces (xhlulu/140k-real-and-fake-faces)
"""

import os, sys, shutil, random, zipfile
from pathlib import Path

SCRIPT_DIR   = Path(__file__).parent
DATA_DIR     = SCRIPT_DIR / "data"
DOWNLOAD_DIR = DATA_DIR / "_download"

# ── How many images per class ────────────────────────────────────────────────
TRAIN_PER_CLASS = 5000
VAL_PER_CLASS   = 1000

DATASET_SLUG = "xhlulu/140k-real-and-fake-faces"


def download_kaggle():
    try:
        import kaggle  # noqa – triggers auth check
    except Exception as e:
        sys.exit(f"kaggle package not available: {e}")

    print(f"[INFO] Downloading dataset '{DATASET_SLUG}' ...")
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    os.system(
        f'kaggle datasets download -d "{DATASET_SLUG}" '
        f'-p "{DOWNLOAD_DIR}" --unzip'
    )


def organise():
    """Copies a balanced subset into train/ and val/ splits."""
    # Common layout in 140k dataset
    possible_roots = [
        DOWNLOAD_DIR / "real_vs_fake" / "real-vs-fake",
        DOWNLOAD_DIR / "real_and_fake_face",
        DOWNLOAD_DIR,
    ]

    src_real = src_fake = None
    for root in possible_roots:
        for rname in ["real", "training_real", "train/real"]:
            p = root / rname
            if p.exists():
                src_real = p
                break
        for fname in ["fake", "training_fake", "train/fake"]:
            p = root / fname
            if p.exists():
                src_fake = p
                break
        if src_real and src_fake:
            break

    # Fallback: walk and collect by parent folder name
    if not src_real or not src_fake:
        all_imgs = list(DOWNLOAD_DIR.rglob("*.jpg")) + list(DOWNLOAD_DIR.rglob("*.png"))
        real_imgs = [p for p in all_imgs if "real" in p.parent.name.lower()]
        fake_imgs = [p for p in all_imgs if "fake" in p.parent.name.lower()]
    else:
        real_imgs = list(src_real.rglob("*.jpg")) + list(src_real.rglob("*.png"))
        fake_imgs = list(src_fake.rglob("*.jpg")) + list(src_fake.rglob("*.png"))

    if not real_imgs or not fake_imgs:
        sys.exit("[ERROR] Could not locate real/fake image folders. Check download.")

    random.seed(42)
    random.shuffle(real_imgs)
    random.shuffle(fake_imgs)

    splits = {
        "train": (TRAIN_PER_CLASS, real_imgs[:TRAIN_PER_CLASS], fake_imgs[:TRAIN_PER_CLASS]),
        "val":   (VAL_PER_CLASS,
                  real_imgs[TRAIN_PER_CLASS:TRAIN_PER_CLASS + VAL_PER_CLASS],
                  fake_imgs[TRAIN_PER_CLASS:TRAIN_PER_CLASS + VAL_PER_CLASS]),
    }

    for split, (n, reals, fakes) in splits.items():
        for cls, imgs in [("real", reals), ("fake", fakes)]:
            dest = DATA_DIR / split / cls
            dest.mkdir(parents=True, exist_ok=True)
            for i, src in enumerate(imgs[:n]):
                shutil.copy2(src, dest / f"{cls}_{i:05d}{src.suffix}")
        print(f"  [OK] {split}: {min(n, len(reals))} real, {min(n, len(fakes))} fake")


if __name__ == "__main__":
    if not (DATA_DIR / "train" / "real").exists():
        download_kaggle()
        organise()
    else:
        print("[OK] Dataset already organised -- skipping download.")
