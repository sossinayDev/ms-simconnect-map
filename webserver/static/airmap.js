const API_KEY = "b450547cd6e6c43c0c0b131a6b1c832e"
const API_BASE_URL = "https://api.core.openaip.net/api/{PTH}?pos={POS}&dist={RNG}"

const ZONE_RANGE = 100000
const MAX_ZONE_DISTANCE = 0.5

const DATA_COMPONENTS = [
    {
        "name": "Airspaces",
        "path": "airspaces"
    },
    {
        "name": "Airfields",
        "path": "airports"
    },
    {
        "name": "Navaids",
        "path": "navaids"
    }
]

function get_component_from_name(name){
    result_component = null
    DATA_COMPONENTS.forEach(component => {
        if (component.name == name) {
            result_component = component
        }
    });
    return result_component
}



// In-memory storage for zones
const zoneStorage = {};

function get_zone_data(zone) {
    return zoneStorage[zone["path"]] || null;
}

function set_zone_data(zone, zone_data) {
    zoneStorage[zone["path"]] = zone_data;
}

function get_all_zones() {
    let zones = [];
    Object.keys(zoneStorage).forEach(zone_path => {
        let lat = zone_path.split("x")[0];
        let lon = zone_path.split("x")[1];
        zones.push({
            latitude: lat,
            longitude: lon,
            path: zone_path
        });
    });
    return zones;
}

function create_zone(latitude, longitude) {
    latitude = round(parseFloat(latitude), 3);
    longitude = round(parseFloat(longitude), 3);
    let zone_path = `${latitude}x${longitude}`;
    if (!zoneStorage[zone_path]) {
        let data = { "components": {} };
        DATA_COMPONENTS.forEach(COMPONENT => {
            data["components"][COMPONENT["name"]] = {
                "status": "not_downloaded",
                "elements": []
            };
        });
        zoneStorage[zone_path] = data;
    }
    return { "latitude": latitude, "longitude": longitude, "path": zone_path };
}

function get_closest_valid_zone(latitude, longitude){
    closest_zone = null
    closest_distance = 9999999999999999999999999999
    get_all_zones().forEach(zone => {
        zone_lat = parseFloat(zone["latitude"])
        zone_lon = parseFloat(zone["longitude"])
        distance = get_distance_between_points([latitude,longitude],[zone_lat,zone_lon])
        if (distance < closest_distance && distance < MAX_ZONE_DISTANCE){
            closest_distance = distance
            closest_zone = zone
        }
    });
    if (!(closest_zone)){
        closest_zone = create_zone(latitude, longitude)
    }
    return closest_zone
}

function get_closest_zone(latitude, longitude){
    closest_zone = null
    closest_distance = 9999999999999999999999999999
    get_all_zones().forEach(zone => {
        zone_lat = parseFloat(zone["latitude"])
        zone_lon = parseFloat(zone["longitude"])
        distance = get_distance_between_points([latitude,longitude],[zone_lat,zone_lon])
        if (distance < closest_distance){
            closest_distance = distance
            closest_zone = zone
        }
    });
    if (!(closest_zone)){
        closest_zone = create_zone(latitude, longitude)
    }
    return closest_zone
}

function get_zone_requirements(zone){
    needed_components = []
    DATA_COMPONENTS.forEach(component => {
        needed_components.push(component.name)
    });
    zone_data = get_zone_data(zone)
    DATA_COMPONENTS.forEach(component => {
        if (Object.keys(zone_data.components).includes(component.name)){
            if (zone_data.components[component.name].status == "done_downloading") {
                needed_components.splice(needed_components.indexOf(component["name"]),1)
            }
                
        }
    })
    return needed_components
}

function get_distance_between_points(pos1, pos2){
    return ((pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2) ** 0.5
}

function get_airmap_data(latitude, longitude){
    let closest_zone = get_closest_valid_zone(latitude, longitude)
    download_airmap_data(latitude, longitude, get_zone_requirements(closest_zone))
    return get_zone_data(closest_zone)
}

function download_airmap_data(latitude, longitude, components){
    let zone = get_closest_zone(latitude, longitude)

    components.forEach(component_name => {
        let zone_data = get_zone_data(zone)
        zone_data["components"][component_name]["status"] = "in_progress"
        set_zone_data(zone, zone_data)

        let elements = []
        
        let api_url = API_BASE_URL.replace("{PTH}",get_component_from_name(component_name).path).replace("{POS}",`${latitude},${longitude}`).replace("{RNG}",ZONE_RANGE)
        let headers = {
            "x-openaip-api-key": API_KEY,
            "accept": "application/json"
        }
        fetch(api_url, { headers: headers })
            .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                console.error(`Failed to download ${component_name} data: ${response.status}, ${response.statusText}`);
                return null;
            }
            })
            .then(data => {
            if (data) {
                if (component_name === "Airspaces") {
                    data["items"].forEach(item => {
                        let correct_points = []
                        item["geometry"]["coordinates"][0].forEach(point => {
                            correct_points.push([point[1],point[0]])
                        });
                        let airspaceData = {
                            name: item["name"],
                            type: "airspace",
                            points: correct_points,
                            altitude: [0, 0]
                        };
                        if (item["upperLimit"] && item["lowerLimit"]) {
                            airspaceData["altitude"] = [item["upperLimit"]["value"], item["lowerLimit"]["value"]];
                        }

                        elements.push(airspaceData);
                    });
                } else if (component_name === "Airfields") {
                data["items"].forEach(item => {
                    let airfieldType = "helipad";
                    let runways = [];

                    if (item["runways"]) {
                    airfieldType = "airport";
                    runways = item["runways"];
                    }

                    let airfieldData = {
                    name: item["name"],
                    icao: "????",
                    type: airfieldType,
                    runways: runways,
                    private: item["private"],
                    location: {
                        latitude: item["geometry"]["coordinates"][1],
                        longitude: item["geometry"]["coordinates"][0]
                    }
                    };

                    if (item["icaoCode"]) {
                    airfieldData["icao"] = item["icaoCode"];
                    }

                    elements.push(airfieldData);
                });
                }
                else if (component_name === "Navaids") {
                    data["items"].forEach(item => {
                        let navaidData = {
                            name: item["name"],
                            type: item["type"],
                            identifier: item["identifier"],
                            frequency: item["frequency"]["value"],
                            location: {
                                latitude: item["geometry"]["coordinates"][1],
                                longitude: item["geometry"]["coordinates"][0]
                            }
                        };
                        elements.push(navaidData);
                    });
                }
            }

            let zone_data = get_zone_data(zone);
            zone_data["components"][component_name]["elements"] = elements;
            zone_data["components"][component_name]["status"] = "done_downloading";
            set_zone_data(zone, zone_data);
            })
            .catch(error => {
            console.error(`Error fetching ${component_name} data: ${error}`);
            });
    });
}

function round(num, amount=1){
    return parseInt(num*10**(amount-1))/10**(amount-1)
}