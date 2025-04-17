from SimConnect import *

# Connect to MSFS
sm=0
try:
    sm = SimConnect()
except ConnectionError:
    print("Connection to MSFS failed. Please make sure MSFS is running.")
    exit(1)
aq = AircraftRequests(sm, _time=100)  # Refresh every 1 second

data_keys = {
    "location": ["PLANE_LATITUDE", "PLANE_LONGITUDE", "PLANE_ALTITUDE", "AIRSPEED_INDICATED", "GPS_GROUND_TRUE_HEADING",]
}

def is_data_complete(_data, _key):
    # Check if all required data is present
    for key in data_keys[_key]:
        if key not in _data:
            return False
        if _data[key] is None:
            return False
    return True

def get_data(path):
    if path in data_keys.keys():
        new_data = {}
        while not is_data_complete(new_data, path):
            for key in data_keys[path]:
                if not key in new_data:
                    new_data[key] = aq.find(key).get()
                else:
                    if new_data[key] is None:
                        new_data[key] = aq.find(key).get()
        return new_data
    else:
        return {"error": "Invalid path"}

def quit():
    sm.exit()
