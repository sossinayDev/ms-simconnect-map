from interfaces import airmap
from flask import Flask, send_from_directory, request
import subprocess
import os
app = Flask(__name__)

airmap.init("airmap_data")

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/airmap')
def airmap_data():
    latitude = float(request.args.get('lat'))
    longitude = float(request.args.get('lon'))
    zone_data = airmap.get_airmap_data(latitude, longitude)
    return zone_data

subprocess.Popen(['python', '-m', 'webbrowser', '-t', 'http://127.0.0.1:5000'])
# Run the Flask app
app.run(port=5000)