import ChatGroupMemberService from "#services/chatGroupMember";
import BaseController from "#controllers/base";

class ChatGroupMemberController extends BaseController {
  static Service = ChatGroupMemberService;
}

export default ChatGroupMemberController;
