import path from 'path';
import readJsonSync from 'read-json-sync';
import resolveModule from 'resolve';

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
export function getPackageDependencies(basedir) {
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
