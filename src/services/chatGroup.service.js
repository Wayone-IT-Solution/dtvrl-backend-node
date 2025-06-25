import BaseService from "#services/base";
import ChatGroup from "#models/chatGroup";
import ChatGroupMemberService from "#services/chatGroupMember";

class ChatGroupService extends BaseService {
  static Model = ChatGroup;

  static async create(data) {
    const chatGroup = await this.Service.create(data);
    const groupMember = await ChatGroupMemberService.create({
      groupId: chatGroup.id,
      userId: data.adminId,
    });
    return chatGroup;
  }
}

export default ChatGroupService;
