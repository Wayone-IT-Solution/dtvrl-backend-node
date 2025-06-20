import ChatGroupMemberService from "#services/chatGroupMember";
import BaseController from "#controllers/base";
import ChatGroup from "#models/chatGroup";
import { sendResponse } from "#utils/response";
import httpStatus from 'http-status'
import User from "#models/user"
import ChatGroupMessage from "#models/chatGroupMessage";

class ChatGroupMemberController extends BaseController {
  static Service = ChatGroupMemberService;

  static async get(req,res,next){
    const {id} = req.params;

    const customOptions = {
      attributes:["id"],
      include:[{
        model:ChatGroup,
        attributes:["id","name","photo"],
        include:[{
          model:ChatGroupMessage,
          attributes:["id","text","createdAt"],
          limit:1,
          order: [['createdAt', 'DESC']],
          include:[{
            model:User,
            attributes:["id","name","profile","username"]
          }]
        }]
      }]
    }

    const options = this.Service.getOptions(req.query,customOptions);

    const data = await this.Service.get(id,req.query,options);
    sendResponse(httpStatus.OK,res,data)
  }

}

export default ChatGroupMemberController;
