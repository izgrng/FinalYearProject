import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT = os.path.dirname(__file__)
DATA_PATH = os.path.join(ROOT, "training_data.csv")
MODEL_PATH = os.path.join(ROOT, "model.joblib")


def main():
    data = pd.read_csv(DATA_PATH)
    texts = data["text"].astype(str).tolist()
    labels = data["label"].astype(str).tolist()

    model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
            ("clf", LogisticRegression(max_iter=1000)),
        ]
    )

    model.fit(texts, labels)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    main()
