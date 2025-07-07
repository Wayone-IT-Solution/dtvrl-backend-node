import admin from "#configs/firebase";

async function sendNewPostNotification(fcmTokens, tokenData) {
  const { notification, data = {} } = tokenData;

  const message = {
    tokens: fcmTokens, // array of FCM tokens
    notification,
    data: {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      ...data,
    },
  };

  const response = await admin.messaging().sendMulticast(message);

  console.log("Success count:", response.successCount);
  console.log("Failure count:", response.failureCount);

  return response;
}

export default sendNewPostNotification;
