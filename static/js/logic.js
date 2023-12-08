// Setting base tile layers
let street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        });

let topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
                        });

let baseMaps = {
    Street : street,
    Topography: topo
};

// Setting function to create description
function addDesc(datetime, assigned_map) {
    let desc = L.control({
        position: 'bottomleft'
    });
    
    desc.onAdd = function() {
        let div = L.DomUtil.create('div', 'desc');
        div.innerHTML += 
            `
            <h2>Earthquakes over past 7 days</h2>
            <p>Size of circle indicates magnitude. Click circle to show details.</p>
            <p>Data obtained from <a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php">earthquake.usgs.gov</a>.</p>
            <p>Last updated: ${datetime}</p>
            `
        
        return div;
    }

    desc.addTo(assigned_map);
}

// Setting function to make legend
function addLegend(assigned_map) {
    let legend = L.control({
        position: 'bottomright'
    });
    
    legend.onAdd = function() {
        let div = L.DomUtil.create('div', 'legend');
        let labels = ['<10', '11-30', '31-50', '51-70', '71-90', '>90'];
        let colours = ['#ffccd5', '#ffb3c1', '#ff758f', '#c9184a', '#800f2f', '#590d22'];

        div.innerHTML += "<p>Depth of epicentre (km)</p>";
        
        for (let i = 0; i < labels.length; i++) {
            div.innerHTML +=
                    '<i style=\"background-color: ' + colours[i] + ';\">&nbsp;</i> ' + labels[i] + '<br>';
        }
        return div;
        }
    
    legend.addTo(assigned_map);
}

// Performing API call to check all earthquakes from past 7 days
d3.json("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson").then(function(quakeData){
    // Performing JSON call in then wrapper to ensure that both API and JSON file are ready before continuning on
    d3.json("https://falconpunch082.github.io/earthquake-visualiser/static/PB2002_boundaries.json").then(function(json){
        // Assigning variable to frequently-used datapoint
        let earthquakes = quakeData["features"];

        // Setting overlays
        // Declaring empty array to be filled in promise block of code
        // As quake_circles is still not populated at this stage, the overlayMaps declaration
        // will not happen until after quake_circles is populated.
        let quake_circles = [];
        // Calling json file to create fault lines
        let fault_lines = json;

        // Creating circle markers for each earthquake
        // and then storing them in the quake_circles array
        for(i = 0; i < earthquakes.length; i++){
            // Determining datapoints
            let coords = [earthquakes[i].geometry.coordinates[1], earthquakes[i].geometry.coordinates[0]];
            let depth = earthquakes[i].geometry.coordinates[2];
            let mag = earthquakes[i].properties.mag;
            let loc = earthquakes[i].properties.place;
            let datetime = new Date(earthquakes[i].properties.time);

            // Determining colour of marker through depth
            function colour(d) {
                if (d <= 10) {
                    return '#ffccd5';
                } else if (d > 10 && d <= 30) {
                    return '#ffb3c1';
                } else if (d > 30 && d <= 50) {
                    return '#ff758f';
                } else if (d > 50 && d <= 70) {
                    return '#c9184a';
                } else if (d > 70 && d <= 90) {
                    return '#800f2f';
                } else {
                    return '#590d22';
                }
            }

            // Determining how big the circle will be through magnitude
            function radius(m) {
                let result = m * 5;
                
                // Ran into errors in generating circles because returned value is NaN
                // Converting all NaNs to numbers
                if (isNaN(result)){
                    result = 0;
                }

                return result;
            }

            // Making popup grammatically correct using regex
            function popup(l) {
                if (l.match(/^\d/)) {
                    return `<h3>Earthquake of magnitude ${mag} detected ${loc} on ${datetime}</h3>`
                } else {
                    return `<h3>Earthquake of magnitude ${mag} detected at ${loc} on ${datetime}</h3>`
                }
            }

            // Pushing circle markers into array
            quake_circles.push(L.circleMarker(coords, 
                                        {
                                        fillOpacity: 0.75,
                                        fillColor: colour(depth),
                                        color: "white",
                                        radius: radius(mag)
                                        }
                                        ).bindPopup(popup(loc)));

            }

        
        // Creating layer groups for quakes and fault lines
        let quakes = L.layerGroup(quake_circles);
        let lines = L.geoJSON(fault_lines);

        // Assigning overlayMaps
        let overlayMaps = {
            Earthquakes: quakes,
            'Tectonic Plates': lines
        };

        // Creating map after all data is collected
        let quake_map = L.map("map", {
            center: [12.844810516662491, 114.26277687079369],
            zoom: 4,
            minZoom: 3,
            layers: [street, quakes, lines]
        });

        // Adding legend and description
        addLegend(quake_map);  
        let gen = Date(quakeData["metadata"]["generated"]);
        addDesc(gen, quake_map);

        // Creating layer control
        L.control.layers(baseMaps, overlayMaps).addTo(quake_map);
    });
});
