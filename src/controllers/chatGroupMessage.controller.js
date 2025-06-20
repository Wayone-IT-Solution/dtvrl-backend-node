import ChatGroupMessageService from "#services/chatGroupMessage";
import BaseController from "#controllers/base";
import User from "#models/user";
import { sendResponse } from "#utils/response";
import httpStatus from "http-status";

class ChatGroupMessageController extends BaseController {
  static Service = ChatGroupMessageService;

  static async get(req,res,next){
    const {id } = req.params;

    const customOptions = {
      include:[{
        model:User,
        attributes:["id","name","profile","username"]
      }]
    }
    const options = this.Service.getOptions(req.query,customOptions);

    const data = await this.Service.get(id,req.query,options);

    sendResponse(httpStatus.OK,res,data)
  }
}

export default ChatGroupMessageController;
