import Post from "#models/post";
import UserService from "#services/user";
import BaseService from "#services/base";
import UserFollowService from "#services/userFollow";
import { session } from "#middlewares/requestSession";
import sendNewPostNotification from "#utils/notification";

class PostService extends BaseService {
  static Model = Post;

  static async create(data) {
    const userId = session.get("userId");
    const post = await super.create(data);

    const notification = {
      title: `New Post from ${userId}`,
      body: "Check out our latest update – you’ll love it!",
    };

    const tokenData = {
      notification,
      data: {
        type: "new_post",
      },
    };

    const customOptions = {
      include: [
        {
          model: UserService.Model,
          as: "user",
          attributes: ["firebaseToken"],
        },
      ],
      attributes: ["id", "userId"],
    };

    const options = UserFollowService.getOptions(
      { pagination: false, otherId: userId },
      customOptions,
    );

    const followers = await UserFollowService.get(
      null,
      { otherId: userId },
      options,
    );

    const firebaseTokens = followers.map((ele) => {
      return ele.user.firebaseToken;
    });

    sendNewPostNotification(firebaseTokens, tokenData)
      .then((ele) => {
        console.log(ele);
      })
      .catch((e) => {
        console.log(e);
      });

    return post;
  }

  static async deleteDoc(id) {
    const doc = await this.Model.findDocById(id);
    await doc.destroy({ force: true });
  }
}

export default PostService;
