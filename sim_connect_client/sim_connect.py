from flask import Flask
from flask_cors import CORS
from interfaces import msfs

app = Flask("sim_connect_client")
CORS(app)  # Enable CORS for all routes

@app.route('/location')
def index():
    return msfs.get_data()

@app.route('/check')
def check():
    return "SimConnect is running!"

app.run(port=1234)
