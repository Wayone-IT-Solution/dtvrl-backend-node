import admin from "#configs/firebase";

async function sendNewPostNotification(fcmTokens, tokenData) {
  const { notification, data = {} } = tokenData;

  const results = await Promise.allSettled(
    fcmTokens.map((token) => {
      return admin.messaging().send({
        token,
        notification,
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          ...data,
        },
      });
    }),
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failureCount = results.filter((r) => {
    console.log(r);
    return r.status === "rejected";
  }).length;

  console.log("Success:", successCount, "Failures:", failureCount);

  return { successCount, failureCount, results };
}

export default sendNewPostNotification;
