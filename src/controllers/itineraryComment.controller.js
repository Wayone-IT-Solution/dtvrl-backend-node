import ItineraryCommentService from "#services/itineraryComment";
import BaseController from "#controllers/base";
import { session } from "#middlewares/requestSession";
import httpStatus from "http-status";
import User from "#models/user";

class ItineraryCommentController extends BaseController {
  static Service = ItineraryCommentService;

  static async create(req, res, next) {
    const userId = session.get("userId");
    req.body.userId = userId;
    const postComment = await this.Service.create(req.body);
    const updatedData = await this.Service.getDoc(
      { id: postComment.id },
      {
        transaction: session.get("transaction"),
        include: [
          {
            model: User,
            attributes: ["id", "name", "profile", "username"],
          },
        ],
      },
    );
    sendResponse(httpStatus.OK, res, updatedData);
  }

  static async get(req, res, next) {
    const customOptions = {
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "profile", "email"],
        },
      ],
    };

    const { id } = req.params;

    const options = this.Service.getOptions(req.query, customOptions);
    const data = await this.Service.get(id, req.query, options);
    sendResponse(httpStatus.OK, res, data);
  }
}

export default ItineraryCommentController;
