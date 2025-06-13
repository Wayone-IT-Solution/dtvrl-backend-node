import env from "#configs/env";
import MemoryService from "#services/memory";
import { session } from "#middlewares/requestSession";

// Custom marker icon path
const CUSTOM_MARKER_IMAGE_URL = "/memory.png";

export default async function renderMap(req, res) {
  const OLA_API_KEY = env.OLA_API_KEY;
  const userId = session.get("userId");

  const options = MemoryService.getOptions(
    { pagination: false, userId },
    { raw: true },
  );
  const memories = await MemoryService.get(null, { userId }, options);

  // Use India Gate as default if lat/lng not provided
  const defaultLat = req.query.lat ? parseFloat(req.query.lat) : 28.6129;
  const defaultLng = req.query.lng ? parseFloat(req.query.lng) : 77.2295;
  const defaultZoom = 15;

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
          background-image: url('${CUSTOM_MARKER_IMAGE_URL}');
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          width: 96px;
          height: 96px;
          cursor: pointer;
          border-radius: 0;
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
          center: [${defaultLng}, ${defaultLat}],
          zoom: ${defaultZoom},
          transformRequest: (url, resourceType) => {
            url = url.replace("app.olamaps.io", "api.olamaps.io");
            return {
              url: url.includes("?") ? url + "&api_key=" + apiKey : url + "?api_key=" + apiKey
            };
          }
        });

        map.addControl(new maplibregl.NavigationControl());

        function onMarkerClick(marker) {
          console.log("Marker clicked:", marker);
          window.flutter_inappwebview?.callHandler?.('selectHandler', marker);
          // You can replace above with alert(marker.name) or open modal
        }

        function addCustomMarker(markerData) {
          const el = document.createElement("div");
          el.className = "custom-marker";

          // Attach custom click handler
          el.addEventListener("click", () => {
            onMarkerClick(markerData);
          });

          const popup = new maplibregl.Popup({ offset: 25 }).setText(markerData.name);

          new maplibregl.Marker({ element: el })
            .setLngLat([markerData.lng, markerData.lat])
            .setPopup(popup)
            .addTo(map);
        }

        map.on('load', () => {
          const markers = ${JSON.stringify(memories)};
          markers.forEach(marker => addCustomMarker({
            name: marker.name,
            lng: marker.longitude,
            lat: marker.latitude,
			id:marker.id
          }));
        });

        map.on("click", (e) => {
          const newMarker = {
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            name: "New Marker",
			id:1
          };
          window.flutter_inappwebview?.callHandler?.('logHandler', newMarker);
        });
      </script>
    </body>
    </html>
  `);
}
