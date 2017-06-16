import { spawnSync } from 'child_process';
import promisify from 'es6-promisify';
import fs from 'fs';
import _ncp from 'ncp';
import path from 'path';
import readJsonSync from 'read-json-sync';
import resolveModule from 'resolve';

const ncp = promisify(_ncp.ncp);
ncp.limit = 8;

// Read config
const config = readJsonSync('.npmbundlerrc');

export default function(args) {
	// TODO: make stuff configurable
	const outputDir = 'build/resources/main/META-INF/resources';
	const tmpDir = 'build/tmp/npm-bundler';

	let promises = [];

	// Create work directories
	mkdirp(tmpDir);
	mkdirp(`${outputDir}/node_modules`);

	// Copy project's package.json
	promises.push(copyRootPackageJson(outputDir));

	// Grab NPM dependencies
	let pkgs = getPackageDependencies('.');
	pkgs = Object.keys(pkgs).map(id => pkgs[id]);
	pkgs = pkgs.filter(pkg => pkg.dir != '.');

	// Process NPM dependencies
	pkgs.forEach(pkg => {
		console.log(`Bundling ${pkg.id}`);

		const tmpPkgDir = `${tmpDir}/${pkg.id}`;
		const outPkgDir = `${outputDir}/node_modules/${pkg.id}`;

		mkdirp(tmpPkgDir);
		mkdirp(outPkgDir);

		promises.push(
			copyPackage(pkg, tmpPkgDir)
				.then(() => runBabel(pkg, tmpPkgDir, outPkgDir))
				.then(() => processPackage(pkg, tmpPkgDir, outPkgDir))
		);
	});

	Promise.all(promises)
		.then(() => console.log('Correctly bundled NPM dependencies'))
		.catch(function(err) {
			console.log(err);
			process.exit(1);
		});
}

function copyRootPackageJson(outputDir) {
	return ncp('package.json', `${outputDir}/package.json`);
}

function runBabel(pkg, srcDir, outDir) {
	const babelRcPath = `${srcDir}/.babelrc`;

	let pkgConfig = config['*'];

	if (config[pkg.id]) {
		Object.assign(pkgConfig, config[pkg.id]);
	}

	// Put a .babelrc in the package
	let babelRc = JSON.stringify(pkgConfig['.babelrc']);
	babelRc = babelRc.replace('{{SRC_DIR}}', srcDir);
	babelRc = babelRc.replace('{{OUT_DIR}}', outDir);
	fs.writeFileSync(babelRcPath, babelRc);

	// Run babel through packages
	const proc = spawnSync('babel', [
		'--source-maps',
		'-D',
		'-d',
		outDir,
		srcDir,
	]);

	if (proc.status != 0) {
		throw new Error(
			`Babel for ${srcDir} failed with error ${proc.status}:\n${proc.stderr}`
		);
	} else if (config['debug-babel']) {
		console.log(proc.stdout.toString());
	}
}

function copyPackage(pkg, dir) {
	return ncp(pkg.dir, dir, {
		filter: file => {
			const relFile = file.substring(pkg.dir.length);
			return (
				!relFile.startsWith('/node_modules/') && relFile != '/node_modules'
			);
		},
	});
}

// 'inject-package-dependencies': ['copy-packages'], // pkg
// 'replace-browser-mains': ['copy-packages'], // pkg
// 'replace-browser-modules': ['copy-packages'], // pkg
// 'normalize-requires': ['replace-browser-mains', 'replace-browser-modules'], // babel
// 'rewrite-browser-requires': ['normalize-requires'], // babel (creo que este ya no es necesario???)
// 'shim-node-globals': ['rewrite-browser-requires'], // babel
// 'shim-node-modules': ['shim-node-globals'], // babel + pkg
// 'wrap-package-modules': ['shim-node-modules'], // babel

function processPackage(pkg, srcDir, outDir) {
	return new Promise((resolve, reject) => {
		resolve();
		/*
		const pkgJson = readJsonSync(`${srcDir}/package.json`);

		let state = {
			pkgJson: pkgJson,
		};

		let pkgConfig = config['*'];

		if (config[pkg.id]) {
			Object.assign(pkgConfig, config[pkg.id]);
		}

		pkgConfig.forEach(pluginName => {
			let pluginConfig = {};

			if (Array.isArray(pluginName)) {
				pluginConfig = pluginName[1];
				pluginName = pluginName[0];

				pluginConfig = JSON.stringify(pluginConfig);
				pluginConfig = pluginConfig.replace('{{SRC_DIR}}', srcDir);
				pluginConfig = pluginConfig.replace('{{OUT_DIR}}', outDir);
				pluginConfig = JSON.parse(pluginConfig);
			}

			try {
				var pluginFile = resolveModule.sync(
					`liferay-npm-bundler-plugin-${pluginName}`,
					{
						basedir: '.',
					}
				);

				const plugin = require(pluginFile).default;

				plugin({ srcDir, outDir, config: pluginConfig }, state);

				resolve();
			} catch (err) {
				reject(err);
			}
		});
		*/
	});
}

/**
 * Recursively find the dependencies of a package living in a `basedir` and
 * return them as a hash of objects where key is the package id and values have
 * the following structure:
 *    {
 *      id: <package id>,     // a package id is a unique `name@version` string
 *      name: <package name>, // package name (without version, not unique)
 *      version: <package version>,
 *      dir: <package dir>
 *    }
 */
function getPackageDependencies(basedir) {
	var pkgs = {};

	var packageJson = readJsonSync(basedir + '/package.json');
	var pkgId = packageJson.name + '@' + packageJson.version;

	pkgs[pkgId] = {
		id: pkgId,
		name: packageJson.name,
		version: packageJson.version,
		dir: basedir,
	};

	var dependencies = packageJson.dependencies || [];

	var dependencyDirs = Object.keys(dependencies).map(function(dependency) {
		return resolveDependencyDir(basedir, dependency);
	});

	dependencyDirs = dependencyDirs.filter(dependencyDir => {
		return dependencyDir != null;
	});

	dependencyDirs.forEach(function(dependencyDir) {
		var depPkgs = getPackageDependencies(dependencyDir);

		Object.keys(depPkgs).forEach(function(pkgId) {
			pkgs[pkgId] = depPkgs[pkgId];
		});
	});

	return pkgs;
}

/**
 * Resolves a `dependency` from the context of a specific `packageDir` and
 * returns its directory
 */
function resolveDependencyDir(packageDir, dependency) {
	var pkgJsonFile = resolveModule.sync(dependency + '/package.json', {
		basedir: packageDir,
	});
	return path.dirname(pkgJsonFile);
}

function mkdirp(dir) {
	const info = path.parse(dir);

	if (info.dir != '') {
		mkdirp(info.dir);
	}

	try {
		fs.mkdirSync(dir);
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err;
		}
	}
}
