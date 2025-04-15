const API_CHECK = "http://127.0.0.1:1234/check";

const API_LOCATION = "http://127.0.0.1:1234/location";

function get_location(){
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

function send_runcheck(){
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

async function check_for_client() {
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
