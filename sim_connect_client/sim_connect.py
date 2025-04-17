from flask import Flask
from flask_cors import CORS
from interfaces import msfs

app = Flask("sim_connect_client")
CORS(app)  # Enable CORS for all routes

@app.route('/<path:path>')
def index(path):
    return msfs.get_data(path)

@app.route('/check')
def check():
    return "SimConnect is running!"

app.run(host="0.0.0.0", port=1234)
