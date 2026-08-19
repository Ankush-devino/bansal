"""
train.py — Generate synthetic Indian forensic assignment data and train a Random Forest model.
The model predicts the best officer-case match score (0-100).
Run: python train.py
"""

import json
import pickle
import random
import numpy as np
from pathlib import Path
from data import OFFICERS, PENDING_CASES, get_distance, specialization_match_score

try:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score
except ImportError:
    print("Installing scikit-learn...")
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "scikit-learn"])
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score

MODEL_DIR = Path(__file__).parent / "model"
MODEL_DIR.mkdir(exist_ok=True)

PRIORITY_WEIGHTS = {"Critical": 1.0, "High": 0.75, "Medium": 0.5, "Low": 0.25}
COMPLEXITY_WEIGHTS = {"High": 1.0, "Medium": 0.6, "Low": 0.3}

def compute_true_score(officer: dict, case: dict) -> float:
    """
    Compute the 'ground truth' match score using the domain rules:
      - Specialization match  : 35%
      - Workload availability : 25%
      - Success rate          : 25%
      - Geographic proximity  : 15%
    Plus bonus for experience vs complexity.
    """
    # 1. Specialization match (35%)
    spec_score = specialization_match_score(officer["skills"], case["evidence_types"])
    spec_component = (spec_score / 100.0) * 35.0

    # 2. Workload (25%) — more free slots = better
    free_slots = officer["max_caseload"] - officer["caseload"]
    workload_score = (free_slots / officer["max_caseload"]) * 100.0
    workload_component = (workload_score / 100.0) * 25.0

    # 3. Success rate (25%)
    success_component = (officer["success_rate"] / 100.0) * 25.0

    # 4. Geographic proximity (15%) — closer = better (inverse distance)
    dist = get_distance(officer["location"], case["location"])
    max_dist = 3000.0
    proximity_score = max(0, (1 - dist / max_dist)) * 100.0
    proximity_component = (proximity_score / 100.0) * 15.0

    base_score = spec_component + workload_component + success_component + proximity_component

    # Experience bonus (0-5 extra points) for complex cases
    complexity_factor = COMPLEXITY_WEIGHTS.get(case["complexity"], 0.5)
    exp_bonus = min(5.0, officer["experience_years"] * 0.3 * complexity_factor)

    final = min(100.0, base_score + exp_bonus)
    return round(final, 2)

def extract_features(officer: dict, case: dict) -> list:
    """
    Extract numeric feature vector for the ML model.
    Features:
      0: specialization_match_score (0-100)
      1: workload_free_ratio (0-1)
      2: success_rate (0-100)
      3: proximity_score (0-100)
      4: experience_years
      5: complexity_numeric (0-1)
      6: priority_numeric (0-1)
      7: caseload_absolute
    """
    spec_score = specialization_match_score(officer["skills"], case["evidence_types"])
    free_ratio = (officer["max_caseload"] - officer["caseload"]) / officer["max_caseload"]
    dist = get_distance(officer["location"], case["location"])
    proximity = max(0, (1 - dist / 3000.0)) * 100.0
    complexity = COMPLEXITY_WEIGHTS.get(case["complexity"], 0.5)
    priority = PRIORITY_WEIGHTS.get(case["priority"], 0.5)
    return [
        spec_score,
        free_ratio * 100,
        officer["success_rate"],
        proximity,
        officer["experience_years"],
        complexity * 100,
        priority * 100,
        officer["caseload"],
    ]

def generate_synthetic_dataset(n_samples: int = 8000) -> tuple:
    """
    Generate synthetic officer-case pairs with realistic noise.
    """
    X, y = [], []
    for _ in range(n_samples):
        officer = random.choice(OFFICERS)
        case = random.choice(PENDING_CASES)

        # Vary caseload randomly
        varied_officer = dict(officer)
        varied_officer["caseload"] = random.randint(0, officer["max_caseload"])

        true_score = compute_true_score(varied_officer, case)
        # Add small Gaussian noise to simulate real-world variance
        noisy_score = np.clip(true_score + np.random.normal(0, 2.5), 0, 100)

        features = extract_features(varied_officer, case)
        X.append(features)
        y.append(noisy_score)

    return np.array(X), np.array(y)

FEATURE_NAMES = [
    "specialization_match",
    "workload_free_pct",
    "success_rate",
    "proximity_score",
    "experience_years",
    "complexity_numeric",
    "priority_numeric",
    "caseload",
]

def train():
    print("=" * 50)
    print("  ForensicAI — Case Assignment Model Trainer")
    print("=" * 50)
    print(f"\nGenerating synthetic dataset (8,000 samples)...")
    X, y = generate_synthetic_dataset(8000)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    print("Training Gradient Boosting Regressor...")
    model = GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.08,
        max_depth=5,
        subsample=0.8,
        min_samples_leaf=10,
        random_state=42,
    )
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"\n[OK] Training complete!")
    print(f"   MAE  : {mae:.3f} points")
    print(f"   R²   : {r2:.4f}")

    # Feature importances
    importances = model.feature_importances_
    print("\n[INFO] Feature importances:")
    for name, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1]):
        bar = "#" * int(imp * 40)
        print(f"   {name:<25} {imp:.3f}  {bar}")

    # Save artifacts
    with open(MODEL_DIR / "gb_model.pkl", "wb") as f:
        pickle.dump(model, f)
    with open(MODEL_DIR / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    meta = {
        "algorithm": "GradientBoostingRegressor",
        "n_estimators": 300,
        "learning_rate": 0.08,
        "mae": round(mae, 3),
        "r2": round(r2, 4),
        "features": FEATURE_NAMES,
        "n_training_samples": 8000,
        "weights": {
            "specialization": 35,
            "workload": 25,
            "success_rate": 25,
            "geographic_proximity": 15,
        },
    }
    with open(MODEL_DIR / "model_meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\n[SAVED] Model saved to: {MODEL_DIR}/")
    print(f"   gb_model.pkl | scaler.pkl | model_meta.json")
    return model, scaler, meta

if __name__ == "__main__":
    train()
