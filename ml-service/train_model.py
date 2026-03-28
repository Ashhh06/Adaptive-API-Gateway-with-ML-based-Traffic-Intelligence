"""
Train RandomForest on oracle-labeled synthetic data with wide coverage + extremes.
"""
import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler
import joblib

from labeling import truth_label, EXTREME_SUITE

RNG = np.random.default_rng(42)

# Wide bounds so the model sees edge cases (matches gateway + stress tests)
BOUNDS = {
    "rpm": (0.0, 320.0),
    "inter": (0.0, 6000.0),
    "ep": (1.0, 14.0),
    "err": (0.0, 1.0),
    "burst": (0.0, 1.0),
}


def sample_row():
    return np.array(
        [
            RNG.uniform(*BOUNDS["rpm"]),
            RNG.uniform(*BOUNDS["inter"]),
            RNG.uniform(*BOUNDS["ep"]),
            RNG.uniform(*BOUNDS["err"]),
            RNG.uniform(*BOUNDS["burst"]),
        ],
        dtype=np.float64,
    )


def sample_candidate_for_class(cls):
    """Biased proposals so rejection sampling hits each label quickly."""
    if cls == 0:
        return np.array(
            [
                RNG.uniform(0, 52),
                RNG.uniform(0, 6000),
                RNG.uniform(1, 4),
                RNG.uniform(0, 0.14),
                RNG.uniform(0.0, 0.48),
            ],
            dtype=np.float64,
        )
    if cls == 2:
        return np.array(
            [
                RNG.uniform(15, 320),
                RNG.uniform(0, 500),
                RNG.uniform(1, 14),
                RNG.uniform(0.0, 1.0),
                RNG.uniform(0.15, 1.0),
            ],
            dtype=np.float64,
        )
    # suspicious: middle band + mixed signals
    return np.array(
        [
            RNG.uniform(15, 130),
            RNG.uniform(0, 3500),
            RNG.uniform(1, 10),
            RNG.uniform(0.05, 0.42),
            RNG.uniform(0.2, 0.87),
        ],
        dtype=np.float64,
    )


def generate_balanced(n_per_class=24_000):
    """Rejection sampling with class-specific proposals (uniform over label support)."""
    X, y = [], []
    for cls in (0, 1, 2):
        got = 0
        attempts = 0
        max_attempts = n_per_class * 200
        while got < n_per_class and attempts < max_attempts:
            row = sample_candidate_for_class(cls)
            if truth_label(row) == cls:
                X.append(row)
                y.append(cls)
                got += 1
            attempts += 1
        if got < n_per_class:
            raise RuntimeError(f"Could not fill class {cls} after {max_attempts} attempts (got {got})")
    return np.array(X), np.array(y)


def augment_extremes(X, y, repeats=400):
    """Oversample hand-crafted extremes so the forest does not miss OOD corners."""
    xs, ys = list(X), list(y)
    for vec, lab, _ in EXTREME_SUITE:
        for _ in range(repeats):
            noise = np.array(
                [
                    RNG.normal(0, 0.8),
                    RNG.normal(0, 25),
                    RNG.normal(0, 0.15),
                    RNG.normal(0, 0.01),
                    RNG.normal(0, 0.015),
                ]
            )
            row = np.clip(
                np.array(vec, dtype=np.float64) + noise,
                [
                    BOUNDS["rpm"][0],
                    BOUNDS["inter"][0],
                    BOUNDS["ep"][0],
                    BOUNDS["err"][0],
                    BOUNDS["burst"][0],
                ],
                [
                    BOUNDS["rpm"][1],
                    BOUNDS["inter"][1],
                    BOUNDS["ep"][1],
                    BOUNDS["err"][1],
                    BOUNDS["burst"][1],
                ],
            )
            # keep label tied to intended semantics (noise small)
            if truth_label(row) != lab:
                row = np.array(vec, dtype=np.float64)
            xs.append(row)
            ys.append(lab)
    return np.array(xs), np.array(ys)


def add_uniform_labeled(n=20_000):
    """Uniform random points in the full box (realistic mix) to sharpen boundaries."""
    X = np.array([sample_row() for _ in range(n)], dtype=np.float64)
    y = np.array([truth_label(row) for row in X])
    return X, y


def main():
    print("Generating balanced training data...")
    X, y = generate_balanced(n_per_class=24_000)
    Xu, yu = add_uniform_labeled(22_000)
    X = np.vstack([X, Xu])
    y = np.concatenate([y, yu])
    X, y = augment_extremes(X, y, repeats=500)

    perm = RNG.permutation(len(X))
    X, y = X[perm], y[perm]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = RandomForestClassifier(
        n_estimators=600,
        max_depth=26,
        min_samples_leaf=1,
        min_samples_split=2,
        max_features="sqrt",
        class_weight=None,
        random_state=42,
        n_jobs=-1,
        oob_score=True,
        bootstrap=True,
    )
    print("Training RandomForest (full data + OOB estimate)...")
    model.fit(X_scaled, y)
    print(f"Out-of-bag score: {model.oob_score_:.5f}")

    y_pred = model.predict(X_scaled)
    print("\nFit metrics (training set):")
    print(classification_report(y, y_pred, target_names=["normal", "suspicious", "malicious"]))
    print("Confusion matrix:\n", confusion_matrix(y, y_pred))

    os.makedirs("model", exist_ok=True)
    joblib.dump(model, "model/model.pkl")
    joblib.dump(scaler, "model/scaler.pkl")

    print("\nExtreme suite (must match oracle):")
    failed = []
    for vec, expected, note in EXTREME_SUITE:
        xs = scaler.transform(np.array([vec]))
        pred = int(model.predict(xs)[0])
        ok = pred == expected
        name = ["normal", "suspicious", "malicious"][pred]
        if not ok:
            failed.append((vec, expected, pred, note))
            print(f"  FAIL {note}: expected {expected}, got {pred} ({name})")
        else:
            print(f"  OK   {note} -> {name}")

    if failed:
        raise SystemExit(f"\n{len(failed)} extreme cases failed; adjust model or labeling.")

    print("\n[OK] Model saved; all extreme-suite checks passed.")


if __name__ == "__main__":
    main()
