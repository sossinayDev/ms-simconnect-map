const airmap_server = "localhost:5000";

function save_values() {
    const settings = {};
    document.querySelectorAll("input").forEach(checkbox => {
        if (checkbox.type === "checkbox") {
            settings[checkbox.id] = checkbox.checked;
        }
    });
    localStorage.setItem("simconnectmap_settings", JSON.stringify(settings));
    update_theme();
}

function load_values() {
    const settings = JSON.parse(localStorage.getItem("simconnectmap_settings"));

    if (settings) {
        Object.keys(settings).forEach(key => {
            let checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = settings[key];
            }
        });
    }

    update_theme();
}

function update_theme() {
    const settings = JSON.parse(localStorage.getItem("simconnectmap_settings"));
    if (settings.dark_mode) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
    else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    }

    if (settings.dark_mode_map) {
        document.getElementById("map").classList.add('dark-theme');
        document.getElementById("map").classList.remove('light-theme');
    }
    else {
        document.getElementById("map").classList.remove('dark-theme');
        document.getElementById("map").classList.add('light-theme');
    }
}

function try_simconnect_connection() {
    console.log("WIP");
}

const markerGroup = L.layerGroup().addTo(window.map);

// Function to add a marker to the map
function add_marker(lat, lon, icon_path, description) {
    let generated_icon = L.icon({
        iconUrl: icon_path,
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -32] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker([lat, lon], { icon: generated_icon });
    marker.bindPopup(description);
    markerGroup.addLayer(marker); // Add marker to the LayerGroup
}

// Function to remove all markers
function remove_all_markers() {
    markerGroup.clearLayers(); // Removes all markers from the map
}

function capitalize(str){
    return str[0].toUpperCase()+str.substr(1).toLowerCase()
}

function namelize(str){
    let str2 = capitalize(str)
    let result = capitalize(str2.split(" ")[0])
    str2.split(" ").slice(1,str2.split(" ").len).forEach(word => {
        result += " " + capitalize(word)
    });
    return result
}

let existingObjects = []

function load_elements() {
    const data = get_airmap_data(map.getCenter().lat, map.getCenter().lng);

    data.components.Airfields.elements.forEach(airport => {
        const airportKey = `${airport.location.latitude},${airport.location.longitude}`;
        if (!existingObjects.includes("ap-"+airportKey)) {
            let description = `<strong>${namelize(airport.name)} (${airport.icao.toUpperCase()})</strong><br>${capitalize(airport.type)}`
            add_marker(airport.location.latitude, airport.location.longitude, `static/img/${airport.type}.png`, description);
            existingObjects.push("ap-"+airportKey);
        }
    });

    data.components.Airspaces.elements.forEach(airspace => {
        if (!existingObjects.includes("as-"+airspace.name)){
            let polygon = L.polygon(airspace.points)
            polygon.addTo(map)
            existingObjects.push("as-"+airspace.name)
        }
    })
}


function render_map() {
    load_elements();
}


window.map.on("moveend", function() {
    render_map();
});

setInterval(render_map, 2000)

window.onload = function() {
    load_values();
    render_map();
}