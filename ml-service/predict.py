import joblib
import numpy as np

model = joblib.load("model/model.pkl")
scaler = joblib.load("model/scaler.pkl")

def predict(features):
    rpm, inter_time, endpoints, error_rate, burst = features

    X = np.array([features])
    X_scaled = scaler.transform(X)

    probs = model.predict_proba(X_scaled)[0]
    pred = np.argmax(probs)

    labels = ["normal", "suspicious", "malicious"]
    label = labels[pred]
    confidence = float(probs[pred])

    # ==========================
    # 🔥 INTELLIGENT CORRECTION
    # ==========================

    # Rule 1: High error rate → never normal
    if error_rate > 0.5 and label == "normal":
        label = "suspicious"

    # Rule 2: High RPM but low error → downgrade malicious
    if rpm > 100 and error_rate < 0.1 and label == "malicious":
        label = "suspicious"

    # Rule 3: Extreme traffic → always malicious
    if rpm > 150 and burst > 0.9:
        label = "malicious"

    return {
        "label": label,
        "confidence": confidence
    }