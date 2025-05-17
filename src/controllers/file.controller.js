import FileService from "#services/file";
import BaseController from "#controllers/base";

class FileController extends BaseController {
  static Service = FileService;
}

export default FileController;
