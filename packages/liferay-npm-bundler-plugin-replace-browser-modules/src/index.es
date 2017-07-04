import fs from 'fs';

export default function({ pkg, config }, { pkgJson }) {
	const browser = pkgJson.browser;

	if (browser) {
		if (typeof browser === 'string') {
			replaceMainModule(pkg.dir, pkgJson);
		} else {
			replaceModules(pkg.dir, pkgJson);
		}
	}
}

function replaceMainModule(pkgDir, pkgJson) {
	const pkgId = `${pkgJson.name}@${pkgJson.version}`;
	const browser = pkgJson.browser;
	const main = pkgJson.main || 'index.js';

	const src = pkgDir + '/' + browser;
	const dest = pkgDir + '/' + main;

	replaceFile(pkgId, src, browser, dest, main);
}

function replaceModules(pkgDir, pkgJson) {
	const pkgId = `${pkgJson.name}@${pkgJson.version}`;
	const browser = pkgJson.browser;

	Object.keys(browser).forEach(from => {
		const to = browser[from];

		if (to == false) {
			return;
		}

		const src = pkgDir + '/' + to;
		const dest = pkgDir + '/' + from;

		replaceFile(pkgId, src, to, dest, from);
	});
}

function replaceFile(pkgId, src, srcName, dest, destName) {
	const srcModuleName = srcName.replace('.js', '');
	const destModuleName = destName.replace('.js', '');

	try {
		let contents = fs.readFileSync(src).toString();
		contents = contents.replace(
			`'${pkgId}/${srcModuleName}'`,
			`'${pkgId}/${destModuleName}'`
		);

		fs.writeFileSync(
			dest,
			'/* Module replaced with ' +
				srcName +
				' by liferay-npm-bundler-plugin-replace-browser-modules */\n' +
				contents
		);
	} catch (err) {
		if (err.code !== 'ENOENT') {
			throw err;
		}
	}
}
