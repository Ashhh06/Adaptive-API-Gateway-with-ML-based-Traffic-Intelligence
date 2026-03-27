from fastapi import FastAPI
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

@app.post("/predict")
def predict_endpoint(data: FeatureInput):
    features = [
        data.requests_per_minute,
        data.avg_inter_request_time,
        data.unique_endpoints_hit,
        data.error_rate,
        data.burst_ratio
    ]

    result = predict(features)
    return result
