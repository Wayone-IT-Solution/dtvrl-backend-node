import MemoryService from "#services/memory";
import BaseController from "#controllers/base";

class MemoryController extends BaseController {
  static Service = MemoryService;
}

export default MemoryController;
