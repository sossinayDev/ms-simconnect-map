from flask import Flask
from interfaces import msfs

app = Flask("sim_connect_client")

@app.route('/location')
def index():
    return msfs.get_data()

app.run(port=1234)
