import fs from 'fs';
import path from 'path';

let packageDirCache = {};

export function getPackageJsonPath(modulePath) {
	return `${getPackageDir(modulePath)}/package.json`;
}

export function getPackageDir(modulePath) {
	let dir = packageDirCache[modulePath];

	if (!dir) {
		dir = path.resolve(modulePath);
		let found = false;

		while (!found) {
			try {
				fs.statSync(`${dir}${path.sep}/package.json`);
				found = true;
			} catch (err) {
				const dirname = path.dirname(dir);

				if (dirname == dir) {
					throw new Error(
						'Cannot find package.json for file: ' + modulePath
					);
				}

				dir = dirname;
			}
		}

		packageDirCache[modulePath] = dir;
	}

	return dir;
}

export function mkdirp(dir) {
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
