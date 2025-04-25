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
}

window.onload = function() {
    load_values();
    update_theme();
}

function download(){
    // Download the simconnect.zip file
    const link = document.createElement('a');
    link.href = 'static/simconnect.zip'; // URL of the file to download
    link.download = 'simconnect.zip'; // Name of the file to be downloaded
    link.click(); // Trigger the download
    link.remove(); // Remove the link element from the document
}