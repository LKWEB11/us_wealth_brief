const admin = require("firebase-admin");
const serviceAccount = require("C:\\Users\\LAVANKUMAR\\Desktop\\us-wealth-brief-firebase-adminsdk-fbsvc-17a896044e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://us-wealth-brief-default-rtdb.firebaseio.com"
});

async function updateRules() {
  try {
    const rules = {
      "rules": {
        ".read": true,
        "news": {
          "daily_feed": {
            ".write": "newData.child('adminKey').val() === 'us_wealth_admin_2026' || data.child('adminKey').val() === 'us_wealth_admin_2026'"
          }
        }
      }
    };
    
    // Admin SDK doesn't natively expose setRules for Realtime DB directly without REST API.
    // Let's use standard REST API with an access token from the credential.
    const token = await admin.credential.cert(serviceAccount).getAccessToken();
    const url = "https://us-wealth-brief-default-rtdb.firebaseio.com/.settings/rules.json";
    
    const fetch = require('node-fetch'); // Need to install this or use https
    const https = require('https');
    
    const data = JSON.stringify(rules);
    
    const options = {
      hostname: 'us-wealth-brief-default-rtdb.firebaseio.com',
      port: 443,
      path: '/.settings/rules.json',
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token.access_token,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        console.log('Rules updated successfully:', responseData);
        process.exit(0);
      });
    });

    req.on('error', (e) => {
      console.error('Error updating rules:', e);
      process.exit(1);
    });

    req.write(data);
    req.end();
    
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

updateRules();
