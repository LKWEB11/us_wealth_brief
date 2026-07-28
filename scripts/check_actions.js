const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/LKWEB11/us_wealth_brief/actions/runs',
  method: 'GET',
  headers: {
    'User-Agent': 'node.js'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const runs = JSON.parse(data).workflow_runs;
      if (runs && runs.length > 0) {
        console.log("Latest 3 runs:");
        for(let i=0; i<Math.min(3, runs.length); i++) {
          console.log(`- ${runs[i].name} | Status: ${runs[i].status} | Conclusion: ${runs[i].conclusion}`);
        }
      } else {
        console.log("No runs found.");
      }
    } catch(e) { console.log(e); }
  });
});
req.on('error', console.error);
req.end();
