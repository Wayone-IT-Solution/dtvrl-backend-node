import PostLike from "#models/postLike";
import UserService from "#services/user";
import BaseService from "#services/base";
import PostService from "#services/post";
import sendNewPostNotification from "#utils/notification";

class PostLikeService extends BaseService {
  static Model = PostLike;

  static async create(data) {
    const { postId, userId } = data;

    const postData = PostService.getDocById(postId, {
      include: [
        {
          model: UserService.Model,
          attributes: ["id", "firebaseToken"],
        },
      ],
    });

    const postLikeData = super.create(data);
    const postCreatorData = UserService.getDocById(userId);

    const [post, postLike, postCreator] = await Promise.all([
      postData,
      postLikeData,
      postCreatorData,
    ]);

    console.log(post.User);

    const notification = {
      title: `New like on your post`,
      body: `${postCreator.name} just liked your post`,
    };

    const tokenData = {
      notification,
      data: {
        type: "new_like",
      },
    };

    const firebaseToken = post.User.firebaseToken;

    console.log(Number(userId), post.userId);
    if (Number(userId) !== post.userId) {
      sendNewPostNotification([firebaseToken], tokenData)
        .then((ele) => {
          console.log(ele);
        })
        .catch((e) => {
          console.log(e);
        });
    }

    return postLike;
  }

  // FIX: like updation has to be fixed
  static async deleteDoc(userId) {}
}

export default PostLikeService;
