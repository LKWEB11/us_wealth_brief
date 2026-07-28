const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/LKWEB11/us_wealth_brief/actions/runs',
  method: 'GET',
  headers: {
    'User-Agent': 'node.js'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    const runId = runs[0].id;
    
    https.get({
      hostname: 'api.github.com',
      path: `/repos/LKWEB11/us_wealth_brief/actions/runs/${runId}/jobs`,
      headers: { 'User-Agent': 'node.js' }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (c) => data2 += c);
      res2.on('end', () => {
        const jobs = JSON.parse(data2).jobs;
        const failedJob = jobs.find(j => j.conclusion === 'failure');
        if (failedJob) {
          console.log(`Failed job ID: ${failedJob.id}`);
          https.get({
            hostname: 'api.github.com',
            path: `/repos/LKWEB11/us_wealth_brief/actions/jobs/${failedJob.id}/logs`,
            headers: { 'User-Agent': 'node.js' }
          }, (res3) => {
             if (res3.statusCode === 302) {
                https.get(res3.headers.location, (res4) => {
                   let logs = '';
                   res4.on('data', c => logs += c);
                   res4.on('end', () => {
                      const lines = logs.split('\n');
                      console.log(lines.slice(-50).join('\n'));
                   });
                });
             } else {
               console.log("No redirect for logs.");
             }
          });
        }
      });
    });
  });
});
