const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
octokit.rest.actions.createWorkflowDispatch({
  owner: 'LKWEB11',
  repo: 'us_wealth_brief',
  workflow_id: 'deploy_web.yml',
  ref: 'master'
}).then(() => console.log("Triggered!")).catch(console.error);
