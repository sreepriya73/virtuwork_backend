# train_model.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from xgboost import XGBClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score
import joblib

# Load the dataset
data = pd.read_csv('data/tasks.csv')

# Combine Skill and Category into a single input feature
data['Input'] = data['Skill'] + ' ' + data['Category']

# Features (X) and Labels (y)
X = data['Input']
y = data['Task Description']

X = X.fillna('')  # Replace NaN in X with empty string
y = y.dropna()    # Drop rows where y is NaN
X = X.loc[y.index]

# Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Encode labels (XGBoost needs numeric labels)
label_map = {label: idx for idx, label in enumerate(y_train.unique())}
y_train_encoded = y_train.map(label_map)

def safe_map(label):
    return label_map.get(label, -1)  # Assign -1 to unseen labels (we'll filter these out)
y_test_encoded = y_test.map(safe_map)

# Filter out test samples with unseen labels (-1)
valid_test_indices = y_test_encoded != -1
X_test = X_test[valid_test_indices]
y_test = y_test[valid_test_indices]
y_test_encoded = y_test_encoded[valid_test_indices]

# Create a pipeline: TF-IDF Vectorizer + XGBoost Classifier
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(max_features=1000)),
    ('clf', XGBClassifier(n_estimators=200, max_depth=10, learning_rate=0.1, random_state=42, use_label_encoder=False, eval_metric='mlogloss'))
])
# Train the model
pipeline.fit(X_train, y_train_encoded)

# Predict and calculate accuracy
y_pred_encoded = pipeline.predict(X_test)
y_pred = [list(label_map.keys())[list(label_map.values()).index(pred)] for pred in y_pred_encoded]
accuracy = accuracy_score(y_test, y_pred)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

# Save the model and label map
joblib.dump(pipeline, 'task_recommender.pkl')
joblib.dump(label_map, 'label_map.pkl')
print("Model and label map saved.")