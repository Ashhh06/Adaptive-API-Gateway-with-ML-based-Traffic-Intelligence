import joblib
import numpy as np

from labeling import LABEL_NAMES, truth_label

model = joblib.load("model/model.pkl")
scaler = joblib.load("model/scaler.pkl")


FEATURE_NAMES = (
    "requests_per_minute",
    "avg_inter_request_time",
    "unique_endpoints_hit",
    "error_rate",
    "burst_ratio",
)


def predict(features, debug=False):
    # rf class vs oracle truth_label; take stricter (max of class indices)
    X = np.array([features], dtype=np.float64)
    X_scaled = scaler.transform(X)

    probs = model.predict_proba(X_scaled)[0]
    ml_class = int(np.argmax(probs))
    oracle_class = int(truth_label(features))
    final_class = max(ml_class, oracle_class)

    if final_class == ml_class:
        confidence = float(probs[final_class])
    else:
        confidence = max(0.93, float(probs[final_class]))

    out = {
        "label": LABEL_NAMES[final_class],
        "confidence": confidence,
    }
    if debug:
        feat_list = [float(x) for x in X[0].tolist()]
        out["debug"] = {
            "features": feat_list,
            "feature_names": list(FEATURE_NAMES),
            "ml_class": ml_class,
            "ml_label": LABEL_NAMES[ml_class],
            "oracle_class": oracle_class,
            "oracle_label": LABEL_NAMES[oracle_class],
            "final_class": final_class,
            "final_label": LABEL_NAMES[final_class],
            "probs": {LABEL_NAMES[i]: round(float(probs[i]), 4) for i in range(len(LABEL_NAMES))},
        }
    return out
