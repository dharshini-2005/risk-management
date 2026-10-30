from pathlib import Path
from datetime import datetime
import threading

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from apscheduler.schedulers.background import BackgroundScheduler

# ── Model loading ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "svm_model.joblib"

model = joblib.load(MODEL_PATH)

FEATURES = [
    "revenue_change_pct",
    "profit_change_pct",
    "expense_change_pct",
    "debt_ratio",
    "customer_demand_change_pct",
    "customer_churn_pct",
    "sales_change_pct",
    "downtime_hours",
    "operational_incidents",
    "delivery_delay_pct",
    "failed_login_attempts",
    "security_incidents",
    "vulnerability_count",
    "negative_feedback_pct",
    "average_rating",
    "sentiment_score",
]

FEATURE_LABELS = {
    "revenue_change_pct":         "Revenue Change %",
    "profit_change_pct":          "Profit Change %",
    "expense_change_pct":         "Expense Change %",
    "debt_ratio":                 "Debt Ratio",
    "customer_demand_change_pct": "Customer Demand Change %",
    "customer_churn_pct":         "Customer Churn %",
    "sales_change_pct":           "Sales Change %",
    "downtime_hours":             "Downtime Hours",
    "operational_incidents":      "Operational Incidents",
    "delivery_delay_pct":         "Delivery Delay %",
    "failed_login_attempts":      "Failed Login Attempts",
    "security_incidents":         "Security Incidents",
    "vulnerability_count":        "Vulnerability Count",
    "negative_feedback_pct":      "Negative Feedback %",
    "average_rating":             "Average Rating",
    "sentiment_score":            "Sentiment Score",
}

# ── SHAP explainer (KernelExplainer works with any sklearn pipeline) ───────────
# Use a small background dataset of realistic "average" values for SHAP
_BACKGROUND = pd.DataFrame([{
    "revenue_change_pct":         0.0,
    "profit_change_pct":          0.0,
    "expense_change_pct":         0.0,
    "debt_ratio":                 0.35,
    "customer_demand_change_pct": 0.0,
    "customer_churn_pct":         3.0,
    "sales_change_pct":           0.0,
    "downtime_hours":             2.0,
    "operational_incidents":      2.0,
    "delivery_delay_pct":         5.0,
    "failed_login_attempts":      20.0,
    "security_incidents":         0.0,
    "vulnerability_count":        3.0,
    "negative_feedback_pct":      15.0,
    "average_rating":             4.0,
    "sentiment_score":            0.1,
}], columns=FEATURES)

explainer = shap.KernelExplainer(
    model.predict,
    _BACKGROUND,
    link="identity",
)

# ── Automated assessment state ─────────────────────────────────────────────────
_assessment_lock = threading.Lock()
_last_assessment: dict | None = None


def _run_scheduled_assessment():
    """
    Simulates an automated periodic risk assessment using the current
    monitoring metrics. In production you would pull live data from
    your database or ERP here.
    """
    snapshot = {
        "revenue_change_pct":         -15.0,
        "profit_change_pct":          -20.0,
        "expense_change_pct":          10.0,
        "debt_ratio":                   0.45,
        "customer_demand_change_pct":  -12.0,
        "customer_churn_pct":           7.2,
        "sales_change_pct":            -8.0,
        "downtime_hours":               8.5,
        "operational_incidents":       12.0,
        "delivery_delay_pct":          15.0,
        "failed_login_attempts":      547.0,
        "security_incidents":           3.0,
        "vulnerability_count":         12.0,
        "negative_feedback_pct":       35.0,
        "average_rating":               3.2,
        "sentiment_score":             -0.3,
    }
    df = pd.DataFrame([snapshot], columns=FEATURES)
    prediction = str(model.predict(df)[0])

    probabilities = {}
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(df)[0]
        probabilities = {
            str(label): round(float(p), 4)
            for label, p in zip(model.classes_, proba)
        }

    # SHAP for scheduled assessment
    shap_values = explainer.shap_values(df)
    if isinstance(shap_values, list):
        # Multi-class: pick the class that matches prediction
        class_list = list(model.classes_)
        idx = class_list.index(prediction) if prediction in class_list else 0
        sv = shap_values[idx][0]
    else:
        sv = shap_values[0]

    contributions = [
        {
            "feature": FEATURE_LABELS[FEATURES[i]],
            "key": FEATURES[i],
            "value": round(float(snapshot[FEATURES[i]]), 4),
            "shap_value": round(float(sv[i]), 4),
            "direction": "increases_risk" if sv[i] > 0 else "decreases_risk",
        }
        for i in range(len(FEATURES))
    ]
    contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    result = {
        "assessed_at": datetime.utcnow().isoformat() + "Z",
        "predicted_risk_level": prediction,
        "class_probabilities": probabilities,
        "snapshot": snapshot,
        "top_contributors": contributions[:5],
        "all_contributions": contributions,
    }

    with _assessment_lock:
        global _last_assessment
        _last_assessment = result


# ── APScheduler: run on startup + every 60 minutes ────────────────────────────
scheduler = BackgroundScheduler()
scheduler.add_job(_run_scheduled_assessment, "interval", minutes=60, id="auto_assess")
scheduler.start()
# Run once immediately on startup (non-blocking)
threading.Thread(target=_run_scheduled_assessment, daemon=True).start()

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="CRAMS ML Risk Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────────
class RiskInput(BaseModel):
    revenue_change_pct: float
    profit_change_pct: float
    expense_change_pct: float
    debt_ratio: float
    customer_demand_change_pct: float
    customer_churn_pct: float
    sales_change_pct: float
    downtime_hours: float = Field(ge=0)
    operational_incidents: float = Field(ge=0)
    delivery_delay_pct: float
    failed_login_attempts: float = Field(ge=0)
    security_incidents: float = Field(ge=0)
    vulnerability_count: float = Field(ge=0)
    negative_feedback_pct: float
    average_rating: float
    sentiment_score: float


class SimulateInput(BaseModel):
    base: RiskInput
    overrides: dict  # partial field overrides to test "what if" scenarios


# ── Helpers ───────────────────────────────────────────────────────────────────
def _predict_df(df: pd.DataFrame) -> dict:
    prediction = str(model.predict(df)[0])
    result = {"predicted_risk_level": prediction}
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(df)[0]
        result["class_probabilities"] = {
            str(label): round(float(p), 4)
            for label, p in zip(model.classes_, proba)
        }
    return result


def _shap_for_df(df: pd.DataFrame, prediction: str) -> list:
    shap_values = explainer.shap_values(df)
    if isinstance(shap_values, list):
        class_list = list(model.classes_)
        idx = class_list.index(prediction) if prediction in class_list else 0
        sv = shap_values[idx][0]
    else:
        sv = shap_values[0]

    contributions = []
    row = df.iloc[0]
    for i, feat in enumerate(FEATURES):
        contributions.append({
            "feature": FEATURE_LABELS[feat],
            "key": feat,
            "value": round(float(row[feat]), 4),
            "shap_value": round(float(sv[i]), 4),
            "direction": "increases_risk" if sv[i] > 0 else "decreases_risk",
        })
    contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
    return contributions


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": "SVM"}


@app.post("/predict")
def predict_risk(data: RiskInput):
    try:
        df = pd.DataFrame([data.model_dump()], columns=FEATURES)
        return _predict_df(df)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@app.post("/explain")
def explain_risk(data: RiskInput):
    """
    Returns the prediction plus SHAP-based feature contributions so the
    UI can show *why* a particular risk level was predicted.
    """
    try:
        df = pd.DataFrame([data.model_dump()], columns=FEATURES)
        pred = _predict_df(df)
        contributions = _shap_for_df(df, pred["predicted_risk_level"])

        return {
            **pred,
            "explanation": {
                "summary": (
                    f"The model classified risk as {pred['predicted_risk_level']}. "
                    f"The top driver was '{contributions[0]['feature']}' "
                    f"({'increasing' if contributions[0]['direction'] == 'increases_risk' else 'decreasing'} risk)."
                ),
                "top_contributors": contributions[:5],
                "all_contributions": contributions,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {exc}") from exc


@app.post("/simulate")
def simulate_risk(data: SimulateInput):
    """
    What-if simulation: takes a base scenario and a dict of field overrides,
    returns predictions for both the base and the modified scenario so the
    UI can show side-by-side comparison.
    """
    try:
        base_dict = data.base.model_dump()
        modified_dict = {**base_dict, **data.overrides}

        # Validate overrides are all known features with numeric values
        unknown = [k for k in data.overrides if k not in FEATURES]
        if unknown:
            raise HTTPException(status_code=422, detail=f"Unknown fields in overrides: {unknown}")

        df_base = pd.DataFrame([base_dict], columns=FEATURES)
        df_mod = pd.DataFrame([modified_dict], columns=FEATURES)

        base_pred = _predict_df(df_base)
        mod_pred = _predict_df(df_mod)

        # Show which fields changed and by how much
        changes = [
            {
                "feature": FEATURE_LABELS[k],
                "key": k,
                "from": round(float(base_dict[k]), 4),
                "to": round(float(modified_dict[k]), 4),
                "delta": round(float(modified_dict[k]) - float(base_dict[k]), 4),
            }
            for k in data.overrides
        ]

        return {
            "base": base_pred,
            "simulated": mod_pred,
            "changes": changes,
            "risk_changed": base_pred["predicted_risk_level"] != mod_pred["predicted_risk_level"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {exc}") from exc


@app.get("/auto-assess")
def get_auto_assessment():
    """
    Returns the latest scheduled automated risk assessment result.
    The scheduler runs this every 60 minutes and on startup.
    """
    with _assessment_lock:
        if _last_assessment is None:
            raise HTTPException(status_code=503, detail="Assessment not ready yet. Please try again in a few seconds.")
        return _last_assessment


@app.post("/auto-assess/run")
def trigger_manual_assessment():
    """Manually trigger an immediate assessment (useful for testing)."""
    threading.Thread(target=_run_scheduled_assessment, daemon=True).start()
    return {"message": "Assessment triggered. Fetch /auto-assess in a moment for results."}
