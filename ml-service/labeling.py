"""
Ground-truth labels for traffic classification (0=normal, 1=suspicious, 2=malicious).

Priority: malicious → normal → suspicious. This keeps single-request / burst edge
cases consistent with the gateway feature extractor (e.g. burst_ratio=1 with rpm=1).
"""


def truth_label(features):
    """
    Deterministic label from the 5 gateway features:
      requests_per_minute, avg_inter_request_time, unique_endpoints_hit,
      error_rate, burst_ratio
    """
    rpm, _inter, ep, err, burst = features
    rpm = float(rpm)
    ep = max(1.0, float(ep))
    err = max(0.0, min(1.0, float(err)))
    burst = max(0.0, min(1.0, float(burst)))

    # ---------- Malicious (checked first) ----------
    if err >= 0.42:
        return 2
    if rpm >= 170:
        return 2
    if rpm >= 95 and burst >= 0.52:
        return 2
    if ep >= 8 and rpm >= 42:
        return 2
    if rpm >= 55 and burst >= 0.82 and err >= 0.18:
        return 2
    if burst >= 0.88 and rpm >= 38:
        return 2

    # ---------- Normal (benign, including low-volume edge cases) ----------
    if rpm <= 48 and err <= 0.14 and ep <= 4:
        if burst <= 0.42 or rpm <= 2:
            return 0
        if rpm <= 8 and err <= 0.05 and burst <= 0.55:
            return 0

    # ---------- Suspicious (everything else) ----------
    return 1


LABEL_NAMES = ("normal", "suspicious", "malicious")


def truth_name(features):
    return LABEL_NAMES[truth_label(features)]


# Fixed cases used to validate the model after training (feature vector, expected class int, note)
EXTREME_SUITE = [
    ([1, 0, 1, 0, 1.0], 0, "single log burst=1"),
    ([2, 5000, 1, 0, 0.5], 0, "very slow pair"),
    ([35, 800, 3, 0.02, 0.15], 0, "steady user"),
    ([48, 200, 4, 0.12, 0.4], 0, "upper normal band"),
    ([60, 150, 4, 0.2, 0.45], 1, "borderline medium"),
    ([90, 100, 5, 0.15, 0.5], 1, "suspicious mid"),
    ([95, 80, 6, 0.25, 0.52], 2, "rpm+burst malicious rule"),
    ([100, 50, 7, 0.3, 0.6], 2, "high rpm burst"),
    ([120, 30, 10, 0.35, 0.7], 2, "scan-like"),
    ([200, 10, 5, 0.1, 0.3], 2, "extreme rpm"),
    ([300, 0, 1, 0, 1.0], 2, "max rpm"),
    ([45, 100, 12, 0.1, 0.4], 2, "many endpoints + rpm"),
    ([50, 200, 1, 0.5, 0.2], 2, "high error rate"),
    ([30, 300, 2, 0.45, 0.2], 2, "error_rate threshold"),
    ([39, 50, 2, 0.1, 0.9], 2, "tight burst + rpm"),
    ([5, 100, 2, 0, 0.95], 1, "spiky low rpm not normal"),
]
