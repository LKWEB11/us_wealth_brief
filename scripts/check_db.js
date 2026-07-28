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

async function check() {
  try {
    const snapshot = await admin.database().ref('news/daily_feed/articles').once('value');
    const articles = snapshot.val();
    if (articles && articles.length > 0) {
      console.log("First article imageUrl:", articles[0].imageUrl);
      console.log("Second article imageUrl:", articles[1].imageUrl);
    } else {
      console.log("No articles found.");
    }
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
