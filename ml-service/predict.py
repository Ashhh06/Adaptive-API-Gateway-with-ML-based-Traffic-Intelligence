import joblib
import numpy as np

from labeling import LABEL_NAMES

model = joblib.load("model/model.pkl")
scaler = joblib.load("model/scaler.pkl")


def predict(features):
    X = np.array([features], dtype=np.float64)
    X_scaled = scaler.transform(X)

    probs = model.predict_proba(X_scaled)[0]
    pred = int(np.argmax(probs))

    return {
        "label": LABEL_NAMES[pred],
        "confidence": float(probs[pred]),
    }
