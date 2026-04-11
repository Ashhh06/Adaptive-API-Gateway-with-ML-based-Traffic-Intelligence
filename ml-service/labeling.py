# 3-class rules on gateway feature vector (rpm, inter, endpoints, err, burst). order: malicious, then normal band, else suspicious.


def truth_label(features):
    rpm, _inter, ep, err, burst = features
    rpm = float(rpm)
    ep = max(1.0, float(ep))
    err = max(0.0, min(1.0, float(err)))
    burst = max(0.0, min(1.0, float(burst)))

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

    if rpm <= 48 and err <= 0.14 and ep <= 4:
        if burst <= 0.42 or rpm <= 2:
            return 0
        if rpm <= 8 and err <= 0.05 and burst <= 0.55:
            return 0

    return 1


LABEL_NAMES = ("normal", "suspicious", "malicious")
