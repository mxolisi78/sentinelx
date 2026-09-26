"""
SentinelX ML anomaly detector.

Wraps a scikit-learn IsolationForest trained on the historical event
corpus. The model is retrained on demand (via a management command or
the API) and saved to disk so it can be loaded for scoring.
"""

import os
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from events.models import SecurityEvent

from .features import extract_matrix


# Where the trained artifacts live
MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = MODEL_DIR / "isolation_forest.joblib"
SCALER_PATH = MODEL_DIR / "scaler.joblib"

MODEL_VERSION = "v1"


class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.scaler = None
        self._load()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _load(self):
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
            except Exception:
                self.model = None
                self.scaler = None

    def save(self):
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)

    @property
    def is_trained(self) -> bool:
        return self.model is not None and self.scaler is not None

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(self, contamination: float = 0.05, n_estimators: int = 200):
        """
        Train the model on the full SecurityEvent corpus.

        contamination ~ expected fraction of outliers in the data. Keep
        it small (5%) so only genuinely odd events get flagged.
        """
        qs = SecurityEvent.objects.all().order_by("id")
        if qs.count() < 20:
            raise ValueError(
                "Not enough events to train (need at least 20)."
            )

        X = extract_matrix(qs)

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_scaled)
        self.save()
        return {"trained_on": len(X), "contamination": contamination}

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def score_one(self, event):
        """
        Score a single event. Returns (raw_score, normalized_0_100, is_anomaly).

        normalized_0_100: 0 = totally normal, 100 = very anomalous
        """
        if not self.is_trained:
            raise RuntimeError("Model is not trained yet.")

        X = extract_matrix([event])
        X_scaled = self.scaler.transform(X)

        # decision_function: negative = more anomalous, positive = normal
        raw = float(self.model.decision_function(X_scaled)[0])

        # Predict: -1 = anomaly, +1 = normal
        pred = int(self.model.predict(X_scaled)[0])
        is_anomaly = pred == -1

        # Normalize raw score to 0-100 using a soft logistic-like map
        # raw scores from IsolationForest are typically in [-0.3, +0.3]
        # We map negative (anomalous) to high numbers, positive to low.
        normalized = int(np.clip((0.15 - raw) * 300, 0, 100))

        return raw, normalized, is_anomaly

    def score_many(self, events):
        """
        Score a list of events efficiently in a single batch.
        Returns list of (event, raw, normalized, is_anomaly).
        """
        if not self.is_trained:
            raise RuntimeError("Model is not trained yet.")

        events = list(events)
        if not events:
            return []

        X = extract_matrix(events)
        X_scaled = self.scaler.transform(X)

        raws = self.model.decision_function(X_scaled)
        preds = self.model.predict(X_scaled)

        results = []
        for ev, raw, pred in zip(events, raws, preds):
            raw = float(raw)
            normalized = int(np.clip((0.15 - raw) * 300, 0, 100))
            results.append((ev, raw, normalized, int(pred) == -1))
        return results


# Module-level singleton for convenience
_detector = None


def get_detector() -> AnomalyDetector:
    global _detector
    if _detector is None:
        _detector = AnomalyDetector()
    return _detector
