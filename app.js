const request = require('request');


if (process.argv.length < 3) {
  console.error('Must provide a package name');
  process.exit(1);
}

let package = process.argv[2];
//NOTE: Ignoring version for now. Need to fix that.
let version = process.argv.length > 3 ? process.argv[3] : null;

request.get(
  `https://api.nuget.org/v3/registration3-gz-semver2/${package.toLowerCase()}/index.json`, { json : true},
  function (err, response, body) {
    if (response.statusCode != 200) {
      console.error(`recieved ${response.statusCode} status code from service`);
      process.exit(1);
    }
  });