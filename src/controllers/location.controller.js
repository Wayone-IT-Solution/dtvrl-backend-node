import LocationService from "#services/location";
import BaseController from "#controllers/base";

class LocationController extends BaseController {
  static Service = LocationService;
}

export default LocationController;
