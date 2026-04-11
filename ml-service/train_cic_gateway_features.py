import os
import glob
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataset")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

RANDOM_SEED = 42

CHUNKSIZE = int(os.environ.get("CIC_TRAIN_CHUNKSIZE", "150000"))
MAX_TRAIN_SAMPLES = int(os.environ.get("CIC_MAX_TRAIN_SAMPLES", "600000"))

_NEEDED_COLUMNS_STRIPPED = frozenset(
    {
        "Label",
        "Flow Packets/s",
        "Flow IAT Mean",
        "Flow IAT Std",
        "Total Fwd Packets",
        "Total Backward Packets",
        "RST Flag Count",
        "SYN Flag Count",
    }
)

SUSPICIOUS = {
    "PortScan",
    "Bot",
    "DoS Hulk",
    "DoS GoldenEye",
    "DoS slowloris",
    "DoS Slowhttptest",
}
MALICIOUS = {
    "DDoS",
    "Heartbleed",
    "Infiltration",
    "Infilteration",
    "Web Attack – Brute Force",
    "Web Attack – Sql Injection",
    "Web Attack – XSS",
}

DASH_FIXES = {
    "Web Attack - Brute Force": "Web Attack – Brute Force",
    "Web Attack - Sql Injection": "Web Attack – Sql Injection",
    "Web Attack - XSS": "Web Attack – XSS",
}

LABELS = ["normal", "suspicious", "malicious"]

def norm_label(s: str) -> str:
    s = str(s).strip()
    s = DASH_FIXES.get(s, s)
    return s


def map_to_3class(label_str: str):
    lab = norm_label(label_str)
    if lab.upper() == "BENIGN" or lab.lower() == "benign":
        return 0
    if lab in SUSPICIOUS:
        return 1
    if lab in MALICIOUS:
        return 2
    return None


def safe_col(df, name_candidates):
    for n in name_candidates:
        if n in df.columns:
            return n
    return None



def derive_gateway_features(df: pd.DataFrame) -> pd.DataFrame:
    # map cic flow columns -> same 5-vector shape as live gateway /predict
    col_flow_pkt_s = safe_col(df, ["Flow Packets/s", "Flow Packets/s "])
    col_flow_iat_mean = safe_col(df, ["Flow IAT Mean", "Flow IAT Mean "])
    col_flow_iat_std = safe_col(df, ["Flow IAT Std", "Flow IAT Std "])
    col_tot_fwd = safe_col(df, ["Total Fwd Packets", "Total Fwd Packets "])
    col_tot_bwd = safe_col(df, ["Total Backward Packets", "Total Backward Packets "])
    col_rst = safe_col(df, ["RST Flag Count", "RST Flag Count "])
    col_syn = safe_col(df, ["SYN Flag Count", "SYN Flag Count "])
    missing = [k for k,v in {
        "Flow Packets/s": col_flow_pkt_s,
        "Flow IAT Mean": col_flow_iat_mean,
        "Flow IAT Std": col_flow_iat_std,
        "Total Fwd Packets": col_tot_fwd,
        "Total Backward Packets": col_tot_bwd,
        "RST Flag Count": col_rst,
        "SYN Flag Count": col_syn,
    }.items() if v is None]
    if missing:
        raise RuntimeError(f"Missing required CIC columns: {missing}\nAvailable columns: {list(df.columns)[:50]} ...")
    flow_pkt_s = pd.to_numeric(df[col_flow_pkt_s], errors="coerce")
    iat_mean = pd.to_numeric(df[col_flow_iat_mean], errors="coerce")
    iat_std = pd.to_numeric(df[col_flow_iat_std], errors="coerce")
    tot_pkts = pd.to_numeric(df[col_tot_fwd], errors="coerce") + pd.to_numeric(df[col_tot_bwd], errors="coerce")
    rst = pd.to_numeric(df[col_rst], errors="coerce")
    syn = pd.to_numeric(df[col_syn], errors="coerce")

    requests_per_minute = (flow_pkt_s * 60.0).clip(lower=0, upper=500)

    iat_mean_ms = iat_mean.copy()
    mask_us = iat_mean_ms > 10000
    iat_mean_ms[mask_us] = iat_mean_ms[mask_us] / 1000.0
    avg_inter_request_time = iat_mean_ms.clip(lower=0, upper=6000)


    unique_endpoints_hit = (np.log1p(tot_pkts).round()).clip(lower=1, upper=14)

    error_rate = ((rst + 0.5 * syn) / 10.0).clip(lower=0, upper=1)

    iat_std_ms = iat_std.copy()
    mask_us2 = iat_std_ms > 10000
    iat_std_ms[mask_us2] = iat_std_ms[mask_us2] / 1000.0
    burst_ratio = (iat_std_ms / (iat_mean_ms + 1e-6) / 20.0).clip(lower=0, upper=1)
    out = pd.DataFrame({
        "requests_per_minute": requests_per_minute,
        "avg_inter_request_time": avg_inter_request_time,
        "unique_endpoints_hit": unique_endpoints_hit,
        "error_rate": error_rate,
        "burst_ratio": burst_ratio,
    })

    return out


def _raw_usecols_for_file(path: str):
    try:
        header = pd.read_csv(path, nrows=0, low_memory=False)
    except UnicodeDecodeError:
        header = pd.read_csv(path, nrows=0, encoding="latin-1", low_memory=False)
    raw = [c for c in header.columns if str(c).strip() in _NEEDED_COLUMNS_STRIPPED]
    found_stripped = {str(c).strip() for c in raw}
    missing = _NEEDED_COLUMNS_STRIPPED - found_stripped
    if missing:
        raise RuntimeError(
            f"{path}: missing required columns {sorted(missing)}. "
            f"Found (stripped): {sorted(found_stripped)}"
        )
    return raw


def _read_csv_chunks(path: str, usecols):
    try:
        return pd.read_csv(
            path,
            usecols=usecols,
            chunksize=CHUNKSIZE,
            low_memory=False,
        )
    except UnicodeDecodeError:
        return pd.read_csv(
            path,
            usecols=usecols,
            chunksize=CHUNKSIZE,
            encoding="latin-1",
            low_memory=False,
        )


def load_features_and_labels():
    # chunked csv read, only columns needed for label + 5-feature vector
    csvs = sorted(glob.glob(os.path.join(DATASET_DIR, "**", "*.csv"), recursive=True))

    if not csvs:
        raise RuntimeError(f"No CSV files found under {DATASET_DIR}. Did you extract MachineLearningCSV.zip here?")

    X_blocks = []
    y_blocks = []

    for path in csvs:
        usecols = _raw_usecols_for_file(path)
        print(f"Loading: {path} (usecols={len(usecols)}, chunksize={CHUNKSIZE:,})")
        for chunk in _read_csv_chunks(path, usecols):
            chunk.columns = chunk.columns.str.strip()
            y_raw = chunk["Label"].map(map_to_3class)
            keep = y_raw.notna()
            if not keep.any():
                continue
            sub = chunk.loc[keep]
            y_chunk = y_raw.loc[keep].astype(np.int8).to_numpy()
            Xdf = derive_gateway_features(sub)
            X = Xdf.to_numpy(dtype=np.float64, copy=True)
            X[np.isinf(X)] = np.nan
            mask = ~np.isnan(X).any(axis=1)
            X = X[mask]
            y_chunk = y_chunk[mask]
            if len(y_chunk) == 0:
                continue
            X_blocks.append(X)
            y_blocks.append(y_chunk)

    if not X_blocks:
        raise RuntimeError("No training rows after label filter; check SUSPICIOUS/MALICIOUS label strings.")


    X = np.vstack(X_blocks)
    y = np.concatenate(y_blocks).astype(int)

    print(f"Total rows (labeled, finite features): {len(y):,}")
    return X, y


def main():
    X, y = load_features_and_labels()

    print("Class counts (0=normal,1=suspicious,2=malicious):", np.bincount(y, minlength=3))


    if len(y) > MAX_TRAIN_SAMPLES:
        print(f"Subsampling stratified: {len(y):,} -> {MAX_TRAIN_SAMPLES:,}")
        idx = np.arange(len(y))
        sub_idx, _ = train_test_split(
            idx,
            train_size=MAX_TRAIN_SAMPLES,
            stratify=y,
            random_state=RANDOM_SEED,
        )
        X = X[sub_idx]
        y = y[sub_idx]
        print("Class counts after subsample:", np.bincount(y, minlength=3))


    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )


    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)



    model = RandomForestClassifier(
        n_estimators=400,
        max_depth=26,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )

    print("Training model...")


    model.fit(X_train_s, y_train)
    y_pred = model.predict(X_test_s)
    print("\nReport (held-out):")
    print(classification_report(y_test, y_pred, target_names=LABELS))
    print("Confusion matrix:\n", confusion_matrix(y_test, y_pred))
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, os.path.join(MODEL_DIR, "model.pkl"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    print(f"\nSaved: {os.path.join(MODEL_DIR, 'model.pkl')}")
    print(f"Saved: {os.path.join(MODEL_DIR, 'scaler.pkl')}")

    
if __name__ == "__main__":
    main()