const admin = require("firebase-admin");
const serviceAccount = require("C:\\Users\\LAVANKUMAR\\Desktop\\us-wealth-brief-firebase-adminsdk-fbsvc-17a896044e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://us-wealth-brief-default-rtdb.firebaseio.com"
});

async function setupBot() {
  let botUid;
  try {
    // Try to get existing user
    const user = await admin.auth().getUserByEmail("bot@us-wealth-brief.com");
    botUid = user.uid;
    console.log("Bot user already exists with UID:", botUid);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      // Create new user
      const userRecord = await admin.auth().createUser({
        email: "bot@us-wealth-brief.com",
        password: "SuperSecretBotPassword123!",
        displayName: "News Bot",
      });
      botUid = userRecord.uid;
      console.log("Successfully created new bot user with UID:", botUid);
    } else {
      console.error("Error checking user:", e);
      return;
    }
  }

  // Set database rules
  const db = admin.database();
  const rules = {
    "rules": {
      ".read": true, // Anyone can read
      "news": {
        ".write": "auth != null && auth.uid === '" + botUid + "'"
      },
      "posts": {
         ".write": "auth != null"
      }
    }
  };
  
  // To set rules via Admin SDK, we actually need to use the REST API or Firebase CLI.
  // Wait, Admin SDK doesn't natively update security rules easily without the REST API.
  console.log("Please update DB rules manually or we can use REST API.");
  console.log("BOT_UID:", botUid);
}

setupBot();
