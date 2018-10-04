const request = require('request');


if (process.argv.length < 3) {
  console.error('Must provide a package name');
  process.exit(1);
}

let packages = process.argv.slice(2);
packages.map(pkg => getDeps(pkg));
//NOTE: Ignoring version for now. Need to fix that. Will probably use @ to signify it.
// let version = process.argv.length > 3 ? process.argv[3] : null;

function getDeps(packageName, version = null) {
  const promise = new Promise((resolve, reject) => {
    request.get(
      `https://api.nuget.org/v3/registration3-gz-semver2/${packageName.toLowerCase()}/index.json`,
      {
        json: true,
        gzip: true
      },
      (err, response, body) => {
        if (err) throw err;
        checkStatusCode(response);
        request.get(body.items[0]['@id'], { gzip: true, json: true }, (err, response, body) => {
          if (err) throw err;
          checkStatusCode(response);
          const catalogEntry = body.items[0].catalogEntry;
          if (catalogEntry && catalogEntry.dependencyGroups && catalogEntry.dependencyGroups.length) {
            const deps = catalogEntry.dependencyGroups[0].dependencies.map(dep => dep.id);
            deps.forEach(dep => console.log(dep));
            return deps.map(dep => getDeps(dep));
          } else {
            resolve(null);
          }
        });
      }
    );
  });

  return promise;
}

function checkStatusCode(response) {
    if (response.statusCode != 200) {
      console.error(`recieved ${response.statusCode} status code from service`);
      process.exit(1);
    }
}