import env from "#configs/env";
import { session } from "#middlewares/requestSession";

const CUSTOM_MARKER_IMAGE_URL = "/memory.png";

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
        }

        #map {
          width: 100%;
          height: 100%;
        }

        .custom-marker {
          background-image: url('${CUSTOM_MARKER_IMAGE_URL}');
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          width: 40px;
          height: 40px;
          cursor: pointer;
          border-radius: 50%;
        }

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
        const apiKey = "${OLA_API_KEY}";

        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
          center: [78.9629, 20.5937],
          zoom: 4.5,
          transformRequest: (url, resourceType) => {
            url = url.replace("app.olamaps.io", "api.olamaps.io");
            return {
              url: url.includes("?") ? url + "&api_key=" + apiKey : url + "?api_key=" + apiKey
            };
          }
        });

        map.addControl(new maplibregl.NavigationControl());

        function addCustomMarker(markerData) {
          const el = document.createElement("div");
          el.className = "custom-marker";

          const popup = new maplibregl.Popup({ offset: 25 })
            .setText(markerData.name);

          new maplibregl.Marker({
            element: el,        // fully custom DOM element
            anchor: "bottom"    // ensures icon sits on point
          })
            .setLngLat([markerData.lng, markerData.lat])
            .setPopup(popup)
            .addTo(map);
        }

        map.on('load', () => {
          fetch("/api/memory?userId=${userId}")
            .then(res => res.json())
            .then(markers => {
              markers.forEach(marker => addCustomMarker(marker));
            })
            .catch(err => console.error("Marker load error", err));
        });

        map.on("click", (e) => {
          addCustomMarker({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            name: "New Marker"
          });
        });
      </script>
    </body>
    </html>
  `);
}
