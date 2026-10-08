from __future__ import annotations

from typing import Any

import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

from xgboost import XGBClassifier


# ============================================================
# Optional LightGBM
# ============================================================

try:
    from lightgbm import LGBMClassifier

except ImportError:
    LGBMClassifier = None


# ============================================================
# Available models
# ============================================================

MODEL_NAMES = {
    "1": "XGBoost",
    "2": "LightGBM",
    "3": "Random Forest",
}


# ============================================================
# Build ML model
# ============================================================

def build_model(choice: str) -> Any:
    """
    Create the selected machine-learning model.

    Choices:
        1 -> XGBoost
        2 -> LightGBM
        3 -> Random Forest
    """

    # --------------------------------------------------------
    # XGBoost
    # --------------------------------------------------------

    if choice == "1":

        return XGBClassifier(
            n_estimators=250,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=42,
        )

    # --------------------------------------------------------
    # LightGBM
    # --------------------------------------------------------

    if choice == "2":

        if LGBMClassifier is None:
            raise ImportError(
                "LightGBM is not installed. "
                "Run: python -m pip install lightgbm"
            )

        return LGBMClassifier(
            n_estimators=250,
            learning_rate=0.05,
            max_depth=4,
            random_state=42,
            verbosity=-1,
        )

    # --------------------------------------------------------
    # Random Forest
    # --------------------------------------------------------

    if choice == "3":

        return RandomForestClassifier(
            n_estimators=300,
            max_depth=8,
            min_samples_leaf=3,
            random_state=42,
        )

    # --------------------------------------------------------
    # Invalid model
    # --------------------------------------------------------

    raise ValueError(
        "Model choice must be 1, 2, or 3."
    )


# ============================================================
# Train and evaluate model
# ============================================================

def train_and_evaluate(
    data: pd.DataFrame,
    choice: str,
) -> tuple[
    Any,
    dict[str, float],
    float,
    int,
]:
    """
    Train the selected model and evaluate it.

    Returns:

        model
            Trained ML model.

        metrics
            Accuracy, precision, recall and F1 score.

        latest_probability
            Probability that the latest observation
            belongs to the UP class.

        latest_prediction
            1 -> UP
            0 -> DOWN
    """

    
    # Validate input
    

    if data.empty:
        raise ValueError(
            "No training data was provided."
        )

    if "Target" not in data.columns:
        raise ValueError(
            "Training data must contain a 'Target' column."
        )

    if choice not in MODEL_NAMES:
        raise ValueError(
            "Invalid model choice. "
            "Use 1, 2, or 3."
        )

    
    # Separate features and target


    features = data.drop(
        columns="Target"
    )

    target = data["Target"]

    # ========================================================
    # Chronological train/test split
    #
    # IMPORTANT:
    # shuffle=False prevents future data from being
    # randomly mixed into the training set.
    # ========================================================

    (
        x_train,
        x_test,
        y_train,
        y_test,
    ) = train_test_split(
        features,
        target,
        test_size=0.2,
        shuffle=False,
    )

    # ========================================================
    # Build selected model
    # ========================================================

    model = build_model(choice)

    # ========================================================
    # Train
    # ========================================================

    model.fit(
        x_train,
        y_train,
    )

    # ========================================================
    # Test predictions
    # ========================================================

    predictions = model.predict(
        x_test
    )

    # ========================================================
    # Calculate evaluation metrics
    # ========================================================

    metrics = {
        "accuracy": accuracy_score(
            y_test,
            predictions,
        ),

        "precision": precision_score(
            y_test,
            predictions,
            zero_division=0,
        ),

        "recall": recall_score(
            y_test,
            predictions,
            zero_division=0,
        ),

        "f1_score": f1_score(
            y_test,
            predictions,
            zero_division=0,
        ),
    }

    # ========================================================
    # Latest prediction probability
    # ========================================================

    latest_probability = float(
        model.predict_proba(
            features.tail(1)
        )[0, 1]
    )

    # ========================================================
    # Latest prediction
    #
    # >= 0.5 → UP
    # <  0.5 → DOWN
    # ========================================================

    latest_prediction = int(
        latest_probability >= 0.5
    )

    # ========================================================
    # Return results
    # ========================================================

    return (
        model,
        metrics,
        latest_probability,
        latest_prediction,
    )