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
    console.log("Run ID:", runId);
    
    https.get({
      hostname: 'api.github.com',
      path: `/repos/LKWEB11/us_wealth_brief/actions/runs/${runId}/jobs`,
      headers: { 'User-Agent': 'node.js' }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (c) => data2 += c);
      res2.on('end', () => {
        const jobs = JSON.parse(data2).jobs;
        console.log("Jobs for run", runId);
        jobs.forEach(j => {
          console.log(`- Job: ${j.name}, conclusion: ${j.conclusion}`);
          j.steps.forEach(s => {
             if (s.conclusion === 'failure') {
               console.log(`   -> Failed Step: ${s.name}`);
             }
          });
        });
      });
    });
  });
});
