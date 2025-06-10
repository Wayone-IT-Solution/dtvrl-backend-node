import env from "#configs/env";
import { session } from "#middlewares/requestSession";

// A URL for a custom map marker icon from the web.
const CUSTOM_MARKER_IMAGE_URL =
  "https://png.monster/wp-content/uploads/2022/09/png.monster-204.png";

// --- "BACKEND" DATA ---
const markersFromBackend = [
  { lat: 28.6139, lng: 77.209, name: "New Delhi" },
  { lat: 19.076, lng: 72.8777, name: "Mumbai" },
  { lat: 12.9716, lng: 77.5946, name: "Bengaluru" },
  { lat: 22.5726, lng: 88.3639, name: "Kolkata" },
  { lat: 17.385, lng: 78.4867, name: "Hyderabad" },
];

export default async function renderMap(req, res) {
  const OLA_API_KEY = env.OLA_API_KEY;

  const userId = session.get("userId");

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Ola Map with Custom Markers</title>
      <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
      <style>
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          font-family: sans-serif;
        }
        #map {
          width: 100%;
          height: 100%;
        }
        .custom-marker {
          /* Use the image URL from our Node.js constant */
          background-image: url('${CUSTOM_MARKER_IMAGE_URL}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          width: 40px;
          height: 40px;
          cursor: pointer;
        }
        /* Style for the popups */
        .maplibregl-popup-content {
          padding: 10px 15px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>

      <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
      <script>
        // The API key is passed from our Node.js server to the client-side script
        const apiKey = "${OLA_API_KEY}";

        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
          center: [78.9629, 20.5937], // Centered on India
          zoom: 4.5,
          transformRequest: (url, resourceType) => {
            url = url.replace("app.olamaps.io", "api.olamaps.io");
            return {
              url: url.includes("?") ? url + "&api_key=" + apiKey : url + "?api_key=" + apiKey
            };
          }
        });

        map.addControl(new maplibregl.NavigationControl());

        /**
         * Creates a custom marker with a popup and adds it to the map.
         * @param {object} markerData - An object with lat, lng, and name.
         */
        function addCustomMarker(markerData) {
          const el = document.createElement("div");
          el.className = "custom-marker";

          // Create a popup, but don't add it to the map yet.
          const popup = new maplibregl.Popup({ offset: 25 }) // offset directs popup away from marker
            .setText(markerData.name);

          // Create the marker and add it to the map.
          new maplibregl.Marker(el)
            .setLngLat([markerData.lng, markerData.lat])
            .setPopup(popup) // sets a popup on this marker
            .addTo(map);
        }

        // Wait for the map to finish loading its initial style
        map.on('load', () => {
          // Fetch markers from our own backend API endpoint
          fetch("/api/memory?userId=${userId}")
            .then(res => res.json())
            .then(markers => {
              console.log('Loaded markers from backend:', markers);
              // For each marker in the data, call our function to add it to the map
              markers.forEach(marker => addCustomMarker(marker));
            })
            .catch(error => {
              console.error('Error fetching markers:', error);
            });
        });

	 	map.on("click", (e) => {
    		const newMarker = {
        		lng: e.lngLat.lng,
        		lat: e.lngLat.lat,
        		name: "New Marker" // You can set any default text for the popup
    		};
    		addCustomMarker(newMarker);
		});
	</script>
    </body>
    </html>
  `);
}
