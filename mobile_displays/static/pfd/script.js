const SIM_URL_BASE = "http://192.168.1.{LOC}:1234/"
let SIM_URL = ""
let connected = false

let SIM_DATA = {}

async function connect() {
    if (connected) return;
    connected = false;
    const requests = Array.from({ length: 256 }, (_, i) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Set a 5-second timeout

        return fetch(SIM_URL_BASE.replace("{LOC}", i) + "check", { signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId); // Clear timeout if request completes
                if (response.ok) {
                    return response.text().then(text => {
                        if (text === "SimConnect is running!") {
                            SIM_URL = SIM_URL_BASE.replace("{LOC}", i);
                            connected = true;
                            console.log("Connected to simulator at " + SIM_URL);
                        }
                    });
                }
            })
            .catch(err => {
                if (err.name !== "AbortError") {
                    console.error(`Error connecting to ${SIM_URL_BASE.replace("{LOC}", i)}:`, err);
                }
                return null; // Suppress other errors
            });
    });
    await Promise.any(requests);
}


async function get_data() {
    console.log(SIM_DATA)
    if (!connected) return;
    const response = await fetch(SIM_URL + "pfd", {});
    const data = await response.json();
    SIM_DATA = data;
}

setInterval(get_data, 1000)



function init(){
    document.getElementById("pfd_container").style.width = window.innerWidth-window.innerWidth*0.02 + "px";
    document.getElementById("pfd_container").style.height = window.innerHeight-window.innerWidth*0.02 + "px";
    document.getElementById("navball").style.width = window.innerHeight*0.8 + "px";
    document.getElementById("navball").style.height = window.innerHeight*0.8 + "px";
    document.getElementById("navball").style.borderRadius = window.innerHeight*0.05 + "px";
    connect()
}

function update_horizon(){
    if (!SIM_DATA) return;
    let roll = SIM_DATA["PLANE_BANK_DEGREES"]
    let pitch = SIM_DATA["PLANE_PITCH_DEGREES"]
    const canvas = document.getElementById("navball");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let yl = 0
    let yr = 0
    if (roll < 0) {
        yl = (canvas.width / 2) + Math.abs(Math.sin(roll) * canvas.width) + ((Math.sin(pitch) * canvas.width) / 2)
        yr = (canvas.width / 2) - Math.abs(Math.sin(roll) * canvas.width) + ((Math.sin(pitch) * canvas.width) / 2)
    }
    else {
        yl = (canvas.width / 2) - Math.abs(Math.sin(roll) * canvas.width) + ((Math.sin(pitch) * canvas.width) / 2)
        yr = (canvas.width / 2) + Math.abs(Math.sin(roll) * canvas.width) + ((Math.sin(pitch) * canvas.width) / 2)
    }
    console.log(((Math.sin(pitch) * canvas.width) / 2))

    ctx.save();
    ctx.fillStyle = "#945d1e";
    ctx.beginPath();
    ctx.moveTo(0, yl);
    ctx.lineTo(canvas.width,yr);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
ctx.fill();
    ctx.fill();
}
setInterval(update_horizon, 10)

window.onload = init;