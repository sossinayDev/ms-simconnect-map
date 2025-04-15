import requests
import os
import json

DATA_PATH = "/airmap_data"

API_KEY = "b450547cd6e6c43c0c0b131a6b1c832e"
API_BASE_URL = "https://api.core.openaip.net/api/{PTH}?pos={POS}&dist={RNG}"

ZONE_RANGE = 50000  # meters
MAX_ZONE_DISTANCE = 0.1  # lat/lon difference

DATA_COMPONENTS = [
    {
        "name": "Airspaces",
        "path": "airspaces"
    },
    {
        "name": "Airfields",
        "path": "airports"
    }
]

def get_component_from_name(name):
    """Get component from name."""
    global DATA_COMPONENTS
    for COMPONENT in DATA_COMPONENTS:
        if COMPONENT["name"] == name:
            return COMPONENT
    return None

def init(data_path):
    global DATA_PATH
    DATA_PATH = data_path

def get_zone_requirements(zone: dict):
    """Get zone requirements from zone data."""
    global DATA_PATH
    needed_components = [COMPONENT["name"] for COMPONENT in DATA_COMPONENTS]
    zone_data = get_zone_data(zone)
    for COMPONENT in DATA_COMPONENTS:
        if COMPONENT["name"] in zone_data["components"].keys():
            if zone_data["components"][COMPONENT["name"]]["status"] == "done_downloading":
                needed_components.remove(COMPONENT["name"])
    return needed_components

def get_all_zones():
    """Get all zones from the specified path."""
    global DATA_PATH
    zones = []
    for zone in os.listdir(DATA_PATH):
        if zone.endswith(".json"):
            lat = zone.split("x")[0]
            lon = zone.split("x")[1].split(".")[0]
            zones.append({
                "latitude": lat,
                "longitude": lon,
                "path": os.path.join(DATA_PATH, zone)
            })
    return zones

def create_zone(latitude, longitude):
    """Create a zone from the specified latitude and longitude."""
    global DATA_PATH
    latitude, longitude = round(float(latitude), 3), round(float(longitude), 3)
    zone_path = os.path.join(DATA_PATH, f"{latitude}x{longitude}.json")
    if not os.path.exists(zone_path):
        with open(zone_path, 'w') as f:
            data = {"components": {}}
            for COMPONENT in DATA_COMPONENTS:
                data["components"][COMPONENT["name"]] = {
                    "status": "not_downloaded",
                    "elements": []
                }
            json.dump(data, f)
    return {"latitude": latitude, "longitude": longitude, "path": zone_path}

def get_closest_zone(latitude, longitude):
    """Get the closest zone to the specified latitude and longitude."""
    global DATA_PATH
    closest_zone = None
    closest_distance = float('inf')
    for zone in get_all_zones():
        zone_lat = float(zone["latitude"])
        zone_lon = float(zone["longitude"])
        distance = ((latitude - zone_lat) ** 2 + (longitude - zone_lon) ** 2) ** 0.5
        if distance < closest_distance:
            closest_distance = distance
            closest_zone = zone
    if closest_zone is None:
        closest_zone = create_zone(latitude, longitude)
    return closest_zone

def get_zone_data(zone: dict):
    """Get zone data from the zone dict."""
    global DATA_PATH
    if os.path.exists(zone["path"]):
        with open(zone["path"], 'r') as f:
            zone_data = json.loads(f.read())
            return zone_data
    else:
        return None
    
def set_zone_data(zone: dict, data: dict):
    """Set zone data to the zone dict."""
    global DATA_PATH
    if os.path.exists(zone["path"]):
        with open(zone["path"], 'w') as f:
            json.dump(data, f)
    else:
        create_zone(zone["latitude"], zone["longitude"])
        set_zone_data(zone, data)

def get_distance_between_points(pos1, pos2):
    """Calculate the distance between two points."""
    lat1, lon1 = float(pos1[0]), float(pos1[1])
    lat2, lon2 = float(pos2[0]), float(pos2[1])
    return ((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2) ** 0.5

def get_airmap_data(latitude, longitude):
    """Get airmap data from the OpenAIP API or from the local storage."""
    global DATA_PATH
    closest_zone = get_closest_zone(latitude, longitude)
    distance = get_distance_between_points((latitude, longitude), (closest_zone["latitude"], closest_zone["longitude"]))
    if distance > MAX_ZONE_DISTANCE:
        create_zone(latitude, longitude)
        closest_zone = get_closest_zone(latitude, longitude)
    
    download_airmap_data(latitude, longitude, get_zone_requirements(closest_zone))
    return get_zone_data(closest_zone)


def download_airmap_data(latitude, longitude, components):
    """Download airmap data from the OpenAIP API."""
    global DATA_PATH

    

    zone = get_closest_zone(latitude, longitude)

    for component_name in components:

        zone_data = get_zone_data(zone)
        zone_data["components"][component_name]["status"] = "in_progress"
        set_zone_data(zone, zone_data)

        elements = []

        api_url = API_BASE_URL.format(PTH=get_component_from_name(component_name)["path"], POS=f"{latitude},{longitude}", RNG=ZONE_RANGE)
        headers = {
            "x-openaip-api-key": API_KEY,
            "accept": "application/json"
        }
        response = requests.get(api_url, headers=headers)
        if response.status_code == 200:
            data = response.json()

            if component_name == "Airspaces":
                for item in data["items"]:
                    data = {
                        "name": item["name"],
                        "type": "airspace",
                        "points": [
                            [coord[1], coord[0]] for coord in item["geometry"]["coordinates"]
                        ],
                        "altitude": [0, 0]
                    }

                    if "upperLimit" in item.keys() and "lowerLimit" in item.keys():
                        data["altitude"] = [item["upperLimit"]["value"], item["lowerLimit"]["value"]]

                    elements.append(data)
            elif component_name == "Airfields":
                
                for item in data["items"]:
                    airfield_type = "helipad"
                    runways = []
                    if "runways" in item.keys():
                        airfield_type = "airport"
                        runways  = item["runways"]


                    data = {
                        "name": item["name"],
                        "icao": "????",
                        "type": airfield_type,
                        "runways": runways,
                        "private": item["private"],
                        "location": {
                            "latitude": item["geometry"]["coordinates"][1],
                            "longitude": item["geometry"]["coordinates"][0],
                        }
                    }

                    if "icaoCode" in item.keys():
                        data["icao"] = item["icaoCode"]

                    elements.append(data)

        else:
            print(f"Failed to download {component_name} data: {response.status_code}, {response.text}")
        
        zone_data = get_zone_data(zone)
        zone_data["components"][component_name]["elements"] = elements
        zone_data["components"][component_name]["status"] = "done_downloading"
        set_zone_data(zone, zone_data)
