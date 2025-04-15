from SimConnect import *

# Connect to MSFS
sm = SimConnect()
aq = AircraftRequests(sm, _time=100)  # Refresh every 1 second

data_keys = ["PLANE_LATITUDE", "PLANE_LONGITUDE", "PLANE_ALTITUDE", "AIRSPEED_INDICATED", "GPS_GROUND_TRUE_HEADING",]

def is_data_complete(_data):
    # Check if all required data is present
    for key in data_keys:
        if key not in _data:
            return False
        if _data[key] is None:
            return False
    return True

def get_data():
    new_data = {}
    while not is_data_complete(new_data):
        for key in data_keys:
            if not key in new_data:
                new_data[key] = aq.find(key).get()
            else:
                if new_data[key] is None:
                    new_data[key] = aq.find(key).get()
    return new_data

def quit():
    sm.exit()
