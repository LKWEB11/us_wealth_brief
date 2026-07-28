const admin = require("firebase-admin");

let FIREBASE_SERVICE_ACCOUNT;
try {
  FIREBASE_SERVICE_ACCOUNT = require("C:\\Users\\LAVANKUMAR\\Desktop\\us-wealth-brief-firebase-adminsdk-fbsvc-17a896044e.json");
} catch (e) {
  console.log("Could not load credentials.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT),
  databaseURL: "https://us-wealth-brief-default-rtdb.firebaseio.com"
});

async function removeImages() {
  try {
    const ref = admin.database().ref('news/daily_feed/articles');
    const snapshot = await ref.once('value');
    const articles = snapshot.val();
    if (articles) {
      for (let i = 0; i < articles.length; i++) {
        if (articles[i].imageUrl) {
          delete articles[i].imageUrl;
        }
      }
      await ref.set(articles);
      console.log("Successfully removed all imageUrls from DB.");
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
removeImages();
