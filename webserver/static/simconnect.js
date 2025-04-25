const API_CHECK = "http://127.0.0.1:1234/check";

const API_LOCATION = "http://127.0.0.1:1234/location";


const REMOTE_SIM_URL_BASE = "http://192.168.1.{LOC}:1234/"
let REMOTE_SIM_URL = ""
let REMOTE_SIM_CONNECTED = false

let remote_connection_mode = false

let SIM_DATA = {}

async function start_remote_connection() {
    REMOTE_SIM_URL = ""
    const requests = Array.from({ length: 256 }, (_, i) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Set a 2-second timeout

        return fetch(REMOTE_SIM_URL_BASE.replace("{LOC}", i) + "check", { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId); // Clear timeout if request completes
                if (response.ok) {
                    return response.text().then(text => {
                        if (text === "SimConnect is running!") {
                            REMOTE_SIM_URL = REMOTE_SIM_URL_BASE.replace("{LOC}", i);
                            REMOTE_SIM_CONNECTED = true;
                            console.log("Connected to simulator at " + REMOTE_SIM_URL);
                            return
                        }
                    });
                }
            })
            .catch(err => {
                if (err.name !== "AbortError") {
                    console.error("Error connecting to remote simulator on ip " + REMOTE_SIM_URL_BASE.replace("{LOC}", i));
                }
                return
            });
    });
    await Promise.any(requests);
}

function get_location() {
    if (remote_connection_mode) {
        return fetch(REMOTE_SIM_URL+"location", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                return data
            })
            .catch(error => console.error('Error fetching location:', error));
    }
    else {
        return fetch(API_LOCATION, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                return data
            })
            .catch(error => console.error('Error fetching location:', error));
    }
}

function send_runcheck() {
    if (remote_connection_mode) {
        return fetch(REMOTE_SIM_URL + "check", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            // If the response is 200, we have a client running
            .then(response => {
                if (response.status === 200) {
                    return true;
                } else {
                    return false;
                }
            })
    }
    else {
        return fetch(API_CHECK, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            // If the response is 200, we have a client running
            .then(response => {
                if (response.status === 200) {
                    return true;
                } else {
                    return false;
                }
            })
    }
}

async function check_for_client() {
    remote_connection_mode = false
    try {
        const isRunning = await send_runcheck();
        if (isRunning) {
            console.log("Client is running.");
        } else {
            console.log("Client is not running.");
        }
        return isRunning;
    } catch (error) {
        console.log("Client is not running.");
        return false;
    }
}

async function check_for_remote_client() {
    remote_connection_mode = true;
    try {
        await start_remote_connection()
        if (!REMOTE_SIM_CONNECTED) {
            console.log("Remote client is not running.");
            return false;
        }
        const isRunning = await send_runcheck();
        if (isRunning) {
            console.log("Remote client is running.");
        } else {
            console.log("Remote client is not running.");
        }
        return isRunning;
    } catch (error) {
        console.log("Remote client is not running.");
        return false;
    }
}
