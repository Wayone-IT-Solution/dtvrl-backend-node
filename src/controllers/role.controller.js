import RoleService from "#services/role";
import BaseController from "#controllers/base";

class RoleController extends BaseController {
  static Service = RoleService;
}

export default RoleController;
