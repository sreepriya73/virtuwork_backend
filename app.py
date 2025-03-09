# app.py
from flask import Flask, request, jsonify
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from flask_cors import CORS
app = Flask(__name__)
CORS(app)

# Load the saved model and vectorizer
try:
    model = joblib.load("task_classifier_model.pkl")
    vectorizer = joblib.load("tfidf_vectorizer.pkl")
except FileNotFoundError as e:
    print(f"Error loading model or vectorizer: {e}")
    print("Please ensure 'task_classifier_model.pkl' and 'tfidf_vectorizer.pkl' exist.")
    exit(1)

@app.route('/')
def home():
    return jsonify({"message": "Welcome to the Virtuwork Task Classifier API"})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get the JSON data from the request
        data = request.get_json(force=True)
        
        # Extract category and skill from the input (changed from task_description)
        category = data.get('category', '')
        skill = data.get('skill', '')
        
        if not category or not skill:
            return jsonify({"error": "Please provide both 'category' and 'skill' in the request body"}), 400

        # Combine category and skill as done during training
        input_text = category + ' ' + skill

        # Transform the input using the saved TF-IDF vectorizer
        input_vector = vectorizer.transform([input_text])

        # Make prediction
        prediction = model.predict(input_vector)
        
        # Return the predicted task description (changed from predicted_category)
        return jsonify({"predicted_task_description": prediction[0]})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)