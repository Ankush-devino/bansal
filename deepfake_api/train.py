"""
train.py — EfficientNet-B0 fine-tuning for deepfake detection

Usage:
    python deepfake_api/train.py

Produces:
    deepfake_api/model/deepfake_efficientnet.pth
    deepfake_api/model/model_meta.json
"""

import os, json, time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import timm
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
DATA_DIR   = SCRIPT_DIR / "data"
MODEL_DIR  = SCRIPT_DIR / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "deepfake_efficientnet.pth"
META_PATH  = MODEL_DIR / "model_meta.json"

# ── Hyper-parameters ─────────────────────────────────────────────────────────
IMG_SIZE   = 224
BATCH_SIZE = 32
LR_HEAD    = 1e-3
LR_UNFREEZE = 1e-4
EPOCHS_HEAD = 3
EPOCHS_FULL = 2
DEVICE     = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"[INFO] Training on: {DEVICE}")

# ── Data transforms ──────────────────────────────────────────────────────────
train_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
    transforms.RandomGrayscale(p=0.05),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.1),
])

val_tf = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ── Dataset loading ───────────────────────────────────────────────────────────
def load_datasets():
    train_path = DATA_DIR / "train"
    val_path   = DATA_DIR / "val"

    if not train_path.exists():
        raise FileNotFoundError(
            "Dataset not found. Run: python deepfake_api/download_dataset.py"
        )

    train_ds = datasets.ImageFolder(train_path, transform=train_tf)
    val_ds   = datasets.ImageFolder(val_path,   transform=val_tf)

    # datasets.ImageFolder sorts classes alphabetically → 0=fake, 1=real
    # We want label=1 → FAKE, label=0 → REAL for intuitive confidence
    print(f"  Class mapping: {train_ds.class_to_idx}")
    print(f"  Train: {len(train_ds)} | Val: {len(val_ds)}")
    return train_ds, val_ds, train_ds.class_to_idx


def get_loaders(train_ds, val_ds):
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE,
                              shuffle=True, num_workers=0, pin_memory=False)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE,
                              shuffle=False, num_workers=0, pin_memory=False)
    return train_loader, val_loader


# ── Model ────────────────────────────────────────────────────────────────────
def build_model():
    model = timm.create_model("efficientnet_b0", pretrained=True, num_classes=2)
    # Freeze backbone initially
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = False
    return model.to(DEVICE)


def unfreeze_last_blocks(model):
    """Unfreeze last 2 EfficientNet blocks for fine-tuning."""
    for name, param in model.named_parameters():
        if any(f"blocks.{i}" in name for i in [5, 6]):
            param.requires_grad = True
        if "bn2" in name or "conv_head" in name:
            param.requires_grad = True


# ── Training loop ─────────────────────────────────────────────────────────────
def train_epoch(model, loader, optimizer, criterion):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        out  = model(imgs)
        loss = criterion(out, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * imgs.size(0)
        correct    += (out.argmax(1) == labels).sum().item()
        total      += imgs.size(0)
    return total_loss / total, correct / total


@torch.no_grad()
def eval_epoch(model, loader, criterion):
    model.eval()
    total_loss, all_preds, all_labels, all_probs = 0.0, [], [], []
    for imgs, labels in loader:
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        out  = model(imgs)
        loss = criterion(out, labels)
        probs = torch.softmax(out, dim=1)[:, 1]
        total_loss += loss.item() * imgs.size(0)
        all_preds.extend(out.argmax(1).cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_probs.extend(probs.cpu().numpy())
    n = len(all_labels)
    acc = accuracy_score(all_labels, all_preds)
    try:
        auc = roc_auc_score(all_labels, all_probs)
    except Exception:
        auc = 0.0
    return total_loss / n, acc, auc, all_labels, all_preds


def run_training():
    train_ds, val_ds, class_map = load_datasets()
    train_loader, val_loader = get_loaders(train_ds, val_ds)
    model     = build_model()
    criterion = nn.CrossEntropyLoss()

    best_acc  = 0.0
    history   = []
    t0        = time.time()

    # ── Phase 1: Train head only ──────────────────────────────────────────────
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=LR_HEAD
    )
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=2, gamma=0.5)

    print(f"\n{'='*60}")
    print("Phase 1 -- Head-only training")
    print(f"{'='*60}")
    for epoch in range(1, EPOCHS_HEAD + 1):
        tr_loss, tr_acc = train_epoch(model, train_loader, optimizer, criterion)
        vl_loss, vl_acc, vl_auc, _, _ = eval_epoch(model, val_loader, criterion)
        scheduler.step()
        print(f"  Epoch {epoch}/{EPOCHS_HEAD} | "
              f"train_loss={tr_loss:.4f} train_acc={tr_acc:.4f} | "
              f"val_loss={vl_loss:.4f} val_acc={vl_acc:.4f} AUC={vl_auc:.4f}")
        history.append(dict(phase=1, epoch=epoch, val_acc=vl_acc, val_auc=vl_auc))
        if vl_acc > best_acc:
            best_acc = vl_acc
            torch.save(model.state_dict(), MODEL_PATH)
            print(f"    [OK] Saved best model (val_acc={best_acc:.4f})")

    # ── Phase 2: Fine-tune with unfrozen blocks ───────────────────────────────
    unfreeze_last_blocks(model)
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=LR_UNFREEZE
    )

    print(f"\n{'='*60}")
    print("Phase 2 -- Fine-tuning (last 2 blocks unfrozen)")
    print(f"{'='*60}")
    for epoch in range(1, EPOCHS_FULL + 1):
        tr_loss, tr_acc = train_epoch(model, train_loader, optimizer, criterion)
        vl_loss, vl_acc, vl_auc, y_true, y_pred = eval_epoch(
            model, val_loader, criterion
        )
        print(f"  Epoch {epoch}/{EPOCHS_FULL} | "
              f"train_loss={tr_loss:.4f} train_acc={tr_acc:.4f} | "
              f"val_loss={vl_loss:.4f} val_acc={vl_acc:.4f} AUC={vl_auc:.4f}")
        history.append(dict(phase=2, epoch=epoch, val_acc=vl_acc, val_auc=vl_auc))
        if vl_acc > best_acc:
            best_acc = vl_acc
            torch.save(model.state_dict(), MODEL_PATH)
            print(f"    [OK] Saved best model (val_acc={best_acc:.4f})")

    elapsed = time.time() - t0
    report  = classification_report(y_true, y_pred,
                                    target_names=list(class_map.keys()),
                                    output_dict=True)

    meta = {
        "model_name":       "EfficientNet-B0",
        "dataset":          "140k-real-and-fake-faces (subset)",
        "best_val_accuracy": round(best_acc, 4),
        "training_seconds": round(elapsed),
        "class_mapping":    class_map,
        "classification_report": report,
        "history":          history,
        "img_size":         IMG_SIZE,
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"\n[DONE] Training complete in {elapsed/60:.1f} min")
    print(f"   Best val accuracy: {best_acc:.4f}")
    print(f"   Model saved to: {MODEL_PATH}")
    print(f"   Meta saved to:  {META_PATH}")


if __name__ == "__main__":
    run_training()
