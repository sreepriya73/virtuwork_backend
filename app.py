from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib

app = Flask(__name__)
CORS(app, resources={r"/recommend-task": {"origins": "http://localhost:3000"}})

model = joblib.load('task_recommender.pkl')
label_map = joblib.load('label_map.pkl')

@app.route('/recommend-task', methods=['POST'])
def recommend_task():
    try:
        data = request.get_json()
        skill = data['skill']
        category = data['category']
        input_data = f"{skill} {category}"
        pred_encoded = model.predict([input_data])[0]
        task_description = list(label_map.keys())[list(label_map.values()).index(pred_encoded)]
        return jsonify({'recommendedTask': task_description})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)