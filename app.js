const fetch = require('node-fetch');
const program = require('commander');

let packages = null;
program
    .arguments('<packages>')
    .action((pkgs) => {
        if (pkgs.trim() === '') {
            console.log('Must provide at least one package');
            process.exit(0);
        }
        packages = pkgs.split(' ');
    })
    .option('-f, --framework [number]', 'Framework version')
    .option('-e, --error [bool]', 'Show error stacktraces')
    // .option('-p, --packages [string]', 'Packages to get deps for')
    .parse(process.argv);

(async function () {
    Promise.all(
        packages.map(
            async pkg => {
                let parts = pkg.split('@');
                let res;
                if (parts.length === 2) {
                  res = await getDeps(parts[0], parts[1]);
                } else {
                  res = await getDeps(pkg)
                }
                return res;
            }
        )
    ).then(pkgs => {
        // let indentLevel = 0;
        pkgs.filter(pkg => pkg).forEach(pkg => {
            logDeps(pkg);
        });
    }).catch((err) => {
        console.error('Unable to find package.');
        if (program.error) {
            console.log(err);
        }
    });
})();

function logDeps(dep, indentLevel = 0) {
    for (let i = 0; i < indentLevel + 1; i++) {
        process.stdout.write('─');
    }
    console.log(dep.name);
    if (dep.dependencies && dep.dependencies.length) {
        indentLevel++;
        dep.dependencies.forEach(subDep => logDeps(subDep, indentLevel));
    }
}

//NOTE: Ignoring version for now. Need to fix that. Will probably use @ to signify it.
// let version = process.argv.length > 3 ? process.argv[3] : null;

async function getDeps(packageName, version = null, obj = null) {
    if (!obj) obj = {};
    obj.name = packageName;
    let packageResponse = await fetch(
        `https://api.nuget.org/v3/registration3-gz-semver2/${packageName.toLowerCase()}/index.json`,
        {
            compress: true
        }
    );
    checkStatusCode(packageResponse);
    let packageJson = await packageResponse.json();
        
    let pkgVersion = version
        ? packageJson.items.filter(i => i.upper === version)[0]
        : packageJson.items.sort(i => parseFloat(i.upper))[0];
    let catalogResponse = await fetch(pkgVersion['@id']);
    checkStatusCode(catalogResponse);
    let catalogJson = await catalogResponse.json();
    const catalogEntry = catalogJson.items[0].catalogEntry;
    if (catalogEntry && catalogEntry.dependencyGroups && catalogEntry.dependencyGroups.length) {
        const deps = catalogEntry.dependencyGroups[0].dependencies.map(dep => dep.id);
        obj.dependencies = [];
        deps.forEach(async dep => {
            const newDepObj = {};
            obj.dependencies.push(newDepObj);
            await getDeps(dep, null, newDepObj);
        });

        return obj;
    } else {
        return null;
    }
}


function checkStatusCode(response) {
    if (!response.ok) {
        console.error(`recieved ${response.status} status code from service`);
        process.exit(1);
    }
}