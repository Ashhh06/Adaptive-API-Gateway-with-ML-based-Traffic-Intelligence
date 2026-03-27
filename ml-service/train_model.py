import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os

def generate_data():
    X = []
    y = []

    # ---------------- NORMAL (0)
    for _ in range(2000):
        X.append([
            np.random.uniform(10, 35),
            np.random.uniform(300, 800),
            np.random.uniform(1, 3),
            np.random.uniform(0, 0.08),
            np.random.uniform(0.1, 0.25)
        ])
        y.append(0)

    # ---------------- SUSPICIOUS (1)
    for _ in range(700):
        X.append([
            np.random.uniform(40, 100),
            np.random.uniform(80, 250),
            np.random.uniform(2, 6),
            np.random.uniform(0.1, 0.6),
            np.random.uniform(0.3, 0.7)
        ])
        y.append(1)

    # ---------------- MALICIOUS (2)
    for _ in range(300):
        X.append([
            np.random.uniform(100, 220),
            np.random.uniform(10, 100),
            np.random.uniform(5, 10),
            np.random.uniform(0.5, 1.0),
            np.random.uniform(0.6, 1.0)
        ])
        y.append(2)

    return np.array(X), np.array(y)


# Generate data
X, y = generate_data()

# Scale
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train model
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10,
    random_state=42
)

model.fit(X_scaled, y)

# Save
os.makedirs("model", exist_ok=True)

joblib.dump(model, "model/model.pkl")
joblib.dump(scaler, "model/scaler.pkl")

print("✅ Random Forest model trained")