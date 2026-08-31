from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import (
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FEATURES = [
    "rainfall_1h",
    "rainfall_6h",
    "rainfall_24h",
    "soil_moisture",
    "elevation",
    "slope",
    "aspect",
]


DATASET_PATH = Path(
    "data/landslide_training.csv"
)

MODEL_PATH = Path(
    "backend/ml/landslide_model.joblib"
)


def load_dataset():
    df = pd.read_csv(
        DATASET_PATH
    )

    required_columns = (
        FEATURES + ["label"]
    )

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing columns: {missing}"
        )

    df = df.dropna(
        subset=required_columns
    )

    X = df[FEATURES]
    y = df["label"].astype(int)

    if y.nunique() != 2:
        raise ValueError(
            "Training data must contain "
            "both classes."
        )

    return X, y


def train():
    X, y = load_dataset()

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=0.20,
            random_state=42,
            stratify=y,
        )
    )

    model = Pipeline(
        [
            (
                "scaler",
                StandardScaler(),
            ),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=300,
                    max_depth=8,
                    min_samples_leaf=3,
                    min_samples_split=6,
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    model.fit(
        X_train,
        y_train,
    )

    predictions = model.predict(
        X_test
    )

    probabilities = model.predict_proba(
        X_test
    )[:, 1]

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    roc_auc = roc_auc_score(
        y_test,
        probabilities,
    )

    print(
        f"Training rows: {len(X_train)}"
    )

    print(
        f"Test rows: {len(X_test)}"
    )

    print(
        f"Accuracy: {accuracy:.4f}"
    )

    print(
        f"ROC-AUC: {roc_auc:.4f}"
    )

    print()

    print(
        classification_report(
            y_test,
            predictions,
            digits=4,
        )
    )

    MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        {
            "model": model,
            "features": FEATURES,
        },
        MODEL_PATH,
    )

    print(
        f"Model saved to: {MODEL_PATH}"
    )


if __name__ == "__main__":
    train()