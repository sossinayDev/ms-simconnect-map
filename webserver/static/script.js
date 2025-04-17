const airmap_server = "localhost:5000";

let is_simconnect_connected = false

let plane_location_data = null

let flightplan = {
    waypoints: []
}

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

async function try_simconnect_connection() {
    if (is_simconnect_connected) {
        console.log("Disconnecting from SimConnect...");
        is_simconnect_connected = false;
        document.getElementById("enable_simconnect").innerText = "Connect to SimConnectMapClient";
    }
    else {
        console.log("Trying to connect to SimConnect...");
        document.getElementById("enable_simconnect").disabled = true;
        document.getElementById("enable_simconnect").innerText = "Connecting...";
        setTimeout(() => { document.getElementById("enable_simconnect").innerText = "Disconnect"; }, 2000);

        let client_running = await check_for_client()
        if (client_running) {
            console.log("SimConnect is running.");
            is_simconnect_connected = true;
            document.getElementById("enable_simconnect").disabled = false;
            document.getElementById("enable_simconnect").innerText = "Connected";
        }
        else {
            console.log("SimConnect is not running.");
            is_simconnect_connected = false;
            document.getElementById("enable_simconnect").disabled = false;
            document.getElementById("enable_simconnect").innerText = "Error while connecting";
            setTimeout(() => { document.getElementById("enable_simconnect").innerText = "Connect to SimConnectMapClient"; }, 2000);
        }
    }
}

async function check_simconnect_status() {
    if (is_simconnect_connected) {
        if (!await check_for_client()) {
            console.log("Connection to SimConnect lost.");
            is_simconnect_connected = false;
            document.getElementById("enable_simconnect").innerText = "Connect to SimConnectMapClient";
        }
    }
}

setInterval(check_simconnect_status, 500)

async function get_plane_data() {
    if (is_simconnect_connected) {
        plane_location_data = await get_location();
    }
}
setInterval(get_plane_data, 1000)

let plane_marker = null
function initialize_plane_marker() {
    let generated_icon = L.icon({
        iconUrl: "static/img/plane.png",
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -32] // point from which the popup should open relative to the iconAnchor
    });
    plane_marker = L.marker([0, 0], { icon: generated_icon });
    plane_marker.bindPopup("Your plane");
    plane_marker.addTo(window.map); // Add marker to the map
}

let markers = []

// Function to add a marker to the map
function add_marker(lat, lon, icon_path, description) {
    const markerGroup = L.layerGroup().addTo(window.map);
    let generated_icon = L.icon({
        iconUrl: icon_path,
        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 16], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -32] // point from which the popup should open relative to the iconAnchor
    });
    let marker = L.marker([lat, lon], { icon: generated_icon });
    marker.bindPopup(description);
    marker.setOpacity((((map.getZoom() / 19 - 0.2) * 10) ** 2) / 10);
    markers.push(marker); // Store the marker in the markers array
    markerGroup.addLayer(marker); // Add marker to the LayerGroup
}

// Function to remove all markers
function remove_all_markers() {
    markerGroup.clearLayers(); // Removes all markers from the map
}

function capitalize(str) {
    return str[0].toUpperCase() + str.substr(1).toLowerCase()
}

function namelize(str) {
    let str2 = capitalize(str)
    let result = capitalize(str2.split(" ")[0])
    str2.split(" ").slice(1, str2.split(" ").len).forEach(word => {
        result += " " + capitalize(word)
    });
    return result
}

let existingObjects = []
let polygons = []

function load_elements() {
    const data = get_airmap_data(map.getCenter().lat, map.getCenter().lng);

    data.components.Airfields.elements.forEach(airport => {
        const airportKey = `${airport.location.latitude},${airport.location.longitude}`;
        if (!existingObjects.includes("ap-" + airportKey)) {
            let description = `<strong>${namelize(airport.name)} (${airport.icao.toUpperCase()})</strong><br>${capitalize(airport.type)}`
            add_marker(airport.location.latitude, airport.location.longitude, `static/img/${airport.type}.png`, description);
            existingObjects.push("ap-" + airportKey);
        }
    });

    data.components.Airspaces.elements.forEach(airspace => {
        if (!existingObjects.includes("as-" + airspace.name)) {
            let polygon = L.polygon(airspace.points, {
                color: '#33aaff', // Border color
                opacity: 0.5, // Border opacity
                fillColor: '#0066ff', // Fill color
                fillOpacity: ((((map.getZoom() / 19 - 0.2) * 10) ** 2) / 10) // Fill opacity
            });
            polygon.addTo(map);
            polygons.push(polygon);
            existingObjects.push("as-" + airspace.name);
        }
    });

    data.components.Navaids.elements.forEach(navaid => {
        const navaidKey = `${navaid.location.latitude},${navaid.location.longitude}`;
        if (!existingObjects.includes("nv-" + navaidKey)) {
            let description = `<strong>${namelize(navaid.name)} (${navaid.identifier})</strong><br>${navaid.frequency} MHz (${navaid.type})`
            add_marker(navaid.location.latitude, navaid.location.longitude, `static/img/navaid-${navaid.type}.svg`, description);
            existingObjects.push("nv-" + navaidKey);
        }
    });
}

function update_plane_marker() {
    if (is_simconnect_connected && plane_location_data) {
        if (document.getElementById("show_plane").checked){
            if (!plane_marker) {
                initialize_plane_marker();
            }

            plane_marker.getElement().style.display="block"

            const lat = plane_location_data.PLANE_LATITUDE;
            const lon = plane_location_data.PLANE_LONGITUDE;
            let heading = plane_location_data.GPS_GROUND_TRUE_HEADING;

            // Update marker position
            plane_marker.setLatLng([lat, lon]);

            // Transform heading from radians to degrees
            heading *= (180 / Math.PI);
            if (heading < 0) {
                heading += 360;
            }
            if (heading > 360) {
                heading -= 360;
            }
            heading = heading.toFixed();
            console.log(heading);

            // Rotate the marker based on the heading
            plane_marker.setRotationAngle(heading);

            // Update popup content
            const description = `<strong>Your plane</strong><br>${heading}° FL${(plane_location_data.PLANE_ALTITUDE / 100).toFixed(0)} ${plane_location_data.AIRSPEED_INDICATED.toFixed()}kt`;
            plane_marker.setPopupContent(description);

            if (document.getElementById("simconnect_track_plane").checked) {
                map.setView([lat, lon], map.getZoom(), { animate: false });
            }
        }
        else {
            if (plane_marker) {
                plane_marker.getElement().style.display="none"
            }
        }
    }
}

function export_flightplan() {
    let flightplan_data = {nodes:[]}
    flightplan.waypoints.forEach(waypoint => {
        type = "FIX"
        if (waypoint.type == "APT") {
            type = "APT"
        }
        flightplan_data.nodes.push({
            type: type,
            ident: waypoint.id,
            name: null,
            alt: parseFloat(waypoint.alt),
            lat: parseFloat(waypoint.lat),
            lon: parseFloat(waypoint.lon),
            via: null
        })
    });
    const blob = new Blob([JSON.stringify(flightplan_data, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${flightplan.waypoints[0].id}-${flightplan.waypoints[flightplan.waypoints.length-1].id}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function import_flightplan() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target.result;
                try {
                    const flightplan_data = JSON.parse(content);
                    document.getElementById("flight_plan_waypoints").innerHTML = ""
                    flightplan.waypoints = []
                    flightplan_data.nodes.forEach(node => {
                        if (node.type == "FIX" || node.type == "APT") {
                            flightplan.waypoints.push({
                                id: node.ident,
                                type: node.type,
                                alt: node.alt,
                                speed: 0,
                                lat: node.lat,
                                lon: node.lon
                            })
                            let element = document.createElement("div")
                            element.classList.add("flight_plan_element")
                            element.id = `flightplan_${node.ident}`
                            element.innerHTML = `<strong>${node.ident}</strong><br><span>${node.alt}ft 0kt</span><button onclick="remove_flightplan_waypoint('flightplan_${node.ident}')">DEL</button>`
                            document.getElementById("flight_plan_waypoints").appendChild(element)
                            show_flightplan();
                        }
                    });
                }
                catch (error) {
                    console.error("Error parsing JSON:", error);
                    alert("Error parsing JSON file. Please make sure it is a valid flight plan file.");
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function clear_flightplan() {
    if (confirm("Are you sure you want to clear the flight plan?")) {
        flightplan.waypoints = []
        document.getElementById("flight_plan_waypoints").innerHTML = ""
        show_flightplan();
    }
}


let path = null

function show_flightplan() {
    if (document.getElementById("show_flightplan").checked) {
        document.getElementById("additional_info").textContent=""
        if (!path) {
            path = L.polyline([], { color: 'green', weight: 5 }).addTo(map);
        }
        let render = true
        flightplan.waypoints.forEach(wp => {
            if (!wp.lat || !wp.lon) {
                document.getElementById("additional_info").textContent="Not showing route: Unknown waypoints"
                render = false
            }
        });
        if (render){
            path.setLatLngs([plane_location_data.PLANE_LATITUDE, plane_location_data.PLANE_LONGITUDE]+flightplan.waypoints.map(wp => [wp.lat, wp.lon]));
        }
        else {
            if (path) {
                path.remove();
                path = null;
            }
        }
    }
    else {
        document.getElementById("additional_info").textContent="Not showing route: Not enabled (see settings)"
        if (path) {
            path.remove();
            path = null;
        }
    }
}

function load_waypoint_data() {
    FIX_WAYPOINTS.list.forEach(waypoint => {
        const lat = FIX_WAYPOINTS.waypoints[waypoint].pos[0];
        const lon = FIX_WAYPOINTS.waypoints[waypoint].pos[1];
        if (!existingObjects.includes(`wp-${waypoint}`)) {
            if (get_distance_between_points([map.getCenter().lat, map.getCenter().lng], [lat, lon]) < 0.4) {
                const type = FIX_WAYPOINTS.waypoints[waypoint].type;
                const name = waypoint
                const description = `<strong>${name.toUpperCase()}</strong><br>${type}`;
                add_marker(lat, lon, `static/img/fix_waypoint.svg`, description);
                existingObjects.push(`wp-${waypoint}`);
            }
        }
    });
}

function render_moving() {
    update_plane_marker();
    show_flightplan();
}
setInterval(render_moving, 100)

function update_marker_opacity() {
    let opacity = 0
    if (document.getElementById("show_airports").checked) {
        if (map.getZoom() > 4) {
            opacity = (((map.getZoom() / 19 - 0.2) * 10) ** 2) / 10
        }
        opacity *= 0.7
    }    
    markers.forEach(marker => {
        marker.setOpacity(opacity);
    });
    opacity = 0
    if (map.getZoom() > 4) {
        opacity = (((map.getZoom() / 19 - 0.2) * 10) ** 2) / 10
    }
    if (opacity > 1) {
        opacity = 1
    }
    opacity *= 0.2
    polygons.forEach(polygon => {
        polygon.setStyle({ fillOpacity: opacity, opacity: opacity * 1.5 });
    });
}

function render_map() {
    load_elements();
    update_marker_opacity();
    load_waypoint_data();
}



async function add_waypoint_to_flightplan(wp_name, altitude, speed) {
    if (Object.keys(FIX_WAYPOINTS.waypoints).includes(wp_name)) {
        document.getElementById('new_waypoint_name').value = ""
        document.getElementById('new_waypoint_altitude').value = ""
        document.getElementById('new_waypoint_speed').value = ""
        flightplan.waypoints.push({
            id: wp_name,
            type: FIX_WAYPOINTS.waypoints[wp_name].type.toUpperCase(),
            alt: altitude,
            speed: speed,
            lat: FIX_WAYPOINTS.waypoints[wp_name].pos[0],
            lon: FIX_WAYPOINTS.waypoints[wp_name].pos[1]
        })
        let element = document.createElement("div")
        element.classList.add("flight_plan_element")
        element.id = `flightplan_${wp_name}`
        element.innerHTML = `<strong>${wp_name}</strong><br><span>${altitude}ft ${speed}kt</span><button onclick="remove_flightplan_waypoint('${element.id}')">DEL</button>`
        document.getElementById("flight_plan_waypoints").appendChild(element)
        document.getElementById('new_waypoint_name').focus()
        
    }
    else {
        if (wp_name.length == 4) {
            let airport_data = null

            try {
                airport_data = await get_airport_data(wp_name)
            }
            catch {
                console.log("error while getting ap info")
            }

            if (airport_data) {
                document.getElementById('new_waypoint_name').value = ""
                document.getElementById('new_waypoint_altitude').value = ""
                document.getElementById('new_waypoint_speed').value = ""
                flightplan.waypoints.push({
                    id: wp_name,
                    type: "APT",
                    alt: altitude,
                    speed: speed,
                    lat: airport_data.location.latitude,
                    lon: airport_data.location.longitude
                })
                let element = document.createElement("div")
                element.classList.add("flight_plan_element")
                element.id = `flightplan_${wp_name}`
                element.innerHTML = `<strong>${wp_name}</strong><br><span>${altitude}ft ${speed}kt</span><button onclick="remove_flightplan_waypoint('${element.id}')">DEL</button>`
                document.getElementById("flight_plan_waypoints").appendChild(element)
                document.getElementById('new_waypoint_name').focus()
            }
            else {
                console.log("unknown airport")
                if (document.getElementById('waypoint_preview_data').textContent=="Press enter again to add airport anyways") {
                    console.log("force adding")
                    document.getElementById('new_waypoint_name').focus()
                    document.getElementById('new_waypoint_name').value = ""
                    document.getElementById('new_waypoint_altitude').value = ""
                    document.getElementById('new_waypoint_speed').value = ""

                    flightplan.waypoints.push({
                        id: wp_name,
                        type: "APT",
                        alt: altitude,
                        speed: speed,
                        lat: 0,
                        lon: 0
                    })
                    let element = document.createElement("div")
                    element.classList.add("flight_plan_element")
                    element.id = `flightplan_${wp_name}`
                    element.innerHTML = `<strong>${wp_name}</strong><br><span>${altitude}ft ${speed}kt</span><button onclick="remove_flightplan_waypoint('${element.id}')">DEL</button>`
                    document.getElementById("flight_plan_waypoints").appendChild(element)

                    
                    document.getElementById('waypoint_preview_data').textContent=""
                }
                else {
                    console.log("chaning text")
                    document.getElementById('waypoint_preview_data').textContent="Press enter again to add airport anyways"
                }
            }
        }
        else {
            console.log("Unknown waypoint")
        }
    }
    show_flightplan()
}

function remove_flightplan_waypoint(id) {
    document.getElementById(id).remove();
    flightplan.waypoints.forEach(waypoint => {
        if (waypoint.id == id.split("_")[1]) {
            flightplan.waypoints.splice(flightplan.waypoints.indexOf(waypoint), 1);
            show_flightplan();
            return
        }
    });
}

async function update_waypoint_preview_data() {
    wp_name = document.getElementById("new_waypoint_name").value
    console.log(wp_name.length)
    if (wp_name.length>4){
        if (Object.keys(FIX_WAYPOINTS.waypoints).includes(wp_name)) {
            document.getElementById("waypoint_preview_data").textContent = `Found: ${FIX_WAYPOINTS.waypoints[wp_name].pos[0]}, ${FIX_WAYPOINTS.waypoints[wp_name].pos[1]} (${FIX_WAYPOINTS.waypoints[wp_name].type})`
        }
        else {
            document.getElementById("waypoint_preview_data").textContent = `Unknown waypoint: ${wp_name}`
        }
    }
    else if (wp_name.length == 4) {
        data = await get_airport_data(wp_name)
        if (data.icao == document.getElementById("new_waypoint_name").value){
            if (data) {
                document.getElementById("waypoint_preview_data").textContent = `Found: ${data.location.latitude}, ${data.location.longitude} (${data.type})`
            }
            else {
                document.getElementById("waypoint_preview_data").textContent = `Unknown airport: ${wp_name}`
            }
        }
    }
    else {
        document.getElementById("waypoint_preview_data").textContent = ""
    }
}

function get_heading_between_points(point1, point2) {
    const lat1 = point1[0] * Math.PI / 180;
    const lon1 = point1[1] * Math.PI / 180;
    const lat2 = point2[0] * Math.PI / 180;
    const lon2 = point2[1] * Math.PI / 180;
    const dLon = lon2 - lon1;
    const x = Math.sin(dLon) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const heading = Math.atan2(x, y) * 180 / Math.PI;
    return (heading + 360) % 360; // Normalize to 0-360 degrees
}

function get_heading_to_next_waypoint(){
    let lat = plane_location_data.PLANE_LATITUDE
    let lon = plane_location_data.PLANE_LONGITUDE
    
}

const next_waypoint = 0
const next_waypoint_distance = 0
const next_waypoint_heading = 0

function track_flight_state(){
    if (flightplan.waypoints.length == 0) {
        return
    }
    let closest_wp = null
    let closest_distance = 1000000000
    flightplan.waypoints.forEach(wp => {
        let distance = get_distance_between_points([wp.lat, wp.lon], [plane_location_data.PLANE_LATITUDE, plane_location_data.PLANE_LONGITUDE])
        if (distance < closest_distance) {
            closest_distance = distance
            closest_wp = wp
        }
    });
}

window.map.on("moveend", function () {
    render_map();
});

setInterval(render_map, 2000)

window.onload = function () {
    load_values();
    render_map();
    if (document.getElementById("simconnect_autostart").checked) {
        try_simconnect_connection();
    }
}

document.getElementById('new_waypoint_name').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('new_waypoint_altitude').focus()
    }
});

document.getElementById('new_waypoint_altitude').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('new_waypoint_speed').focus()
    }
});

document.getElementById('new_waypoint_speed').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        console.log(`Adding waypoint ${document.getElementById('new_waypoint_name').value}`)
        add_waypoint_to_flightplan(document.getElementById('new_waypoint_name').value, document.getElementById('new_waypoint_altitude').value, document.getElementById('new_waypoint_speed').value)
    }
});