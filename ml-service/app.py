import os
from typing import Optional

from fastapi import FastAPI, Header
from pydantic import BaseModel
from predict import predict

app = FastAPI()

class FeatureInput(BaseModel):
    requests_per_minute: float
    avg_inter_request_time: float
    unique_endpoints_hit: float
    error_rate: float
    burst_ratio: float

@app.get("/health")
def health():
    return {"status": "ok"}

def _debug_enabled(x_ml_debug: Optional[str]) -> bool:
    env = os.environ.get("ML_DEBUG", "").strip().lower()
    if env in ("1", "true", "yes"):
        return True
    return (x_ml_debug or "").strip() == "1"


@app.post("/predict")
def predict_endpoint(
    data: FeatureInput,
    x_ml_debug: Optional[str] = Header(default=None, alias="X-ML-Debug"),
):
    features = [
        data.requests_per_minute,
        data.avg_inter_request_time,
        data.unique_endpoints_hit,
        data.error_rate,
        data.burst_ratio,
    ]
    return predict(features, debug=_debug_enabled(x_ml_debug))
