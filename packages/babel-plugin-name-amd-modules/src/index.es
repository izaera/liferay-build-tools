// TODO: check that module names are correct in Windoze

import { getPackageDir, getPackageJsonPath } from 'liferay-build-tools-util';
import path from 'path';
import readJsonSync from 'read-json-sync';

/**
 * options:
 *	  packageName: '<package.json>'
 *    srcPrefixes: ['src/main/resources/META-INF/resources']
 */
export default function({ types: t }) {
	const nameVisitor = {
		ExpressionStatement(path, { opts }) {
			const node = path.node;
			const expression = node.expression;

			if (t.isCallExpression(expression)) {
				const callee = expression.callee;

				if (t.isIdentifier(callee, { name: 'define' })) {
					const args = expression.arguments;

					let insertName = false,
						unshiftName = true;

					switch (args.length) {
						case 1:
							insertName = t.isFunctionExpression(args[0]);
							break;

						case 2:
							insertName =
								t.isArrayExpression(args[0]) &&
								t.isFunctionExpression(args[1]);
							break;

						case 3:
							unshiftName = false;
							insertName =
								t.isStringLiteral(args[0]) &&
								t.isArrayExpression(args[1]) &&
								t.isFunctionExpression(args[2]);
							break;
					}

					if (insertName) {
						const packageName = getPackageName(
							this.opts.packageName,
							this.filenameRelative
						);

						const moduleName = getModuleName(
							this.filenameRelative,
							getSrcPrefixes(opts)
						);

						if (unshiftName) {
							args.unshift(
								t.stringLiteral(`${packageName}${moduleName}`)
							);
						} else {
							args[0].value = `${packageName}${moduleName}`;
						}

						path.stop();
					}
				}
			}
		},
	};

	return {
		visitor: {
			Program: {
				exit(path, state) {
					// We must traverse the AST again because the
					// transform-es2015-modules-amd plugin emits its define()
					// call after exiting Program node :-(
					path.traverse(nameVisitor, {
						filenameRelative: state.file.opts.filenameRelative,
						opts: state.opts,
					});
				},
			},
		},
	};
}

function getPackageName(packageName, filenameRelative) {
	packageName = packageName || '<package.json>';

	if (packageName === '<package.json>') {
		const pkgJsonPath = getPackageJsonPath(filenameRelative);
		const pkgJson = readJsonSync(pkgJsonPath);

		packageName = `${pkgJson.name}@${pkgJson.version}/`;
	}

	if (!packageName.endsWith('/')) {
		packageName += '/';
	}

	return packageName;
}

function getModuleName(filenameRelative, srcPrefixes) {
	const filenameAbsolute = path.resolve(filenameRelative);
	const pkgDir = getPackageDir(filenameRelative);

	let moduleName = filenameAbsolute.substring(pkgDir.length + 1);

	if (moduleName.toLowerCase().endsWith('.js')) {
		moduleName = moduleName.substring(0, moduleName.length - 3);
	}

	for (let i = 0; i < srcPrefixes.length; i++) {
		const srcPrefix = srcPrefixes[i];

		if (moduleName.startsWith(srcPrefix)) {
			moduleName = moduleName.substring(srcPrefix.length);
			break;
		}
	}

	return moduleName;
}

function getSrcPrefixes(opts) {
	let srcPrefixes = opts.srcPrefixes || [
		'src/main/resources/META-INF/resources',
	];

	return srcPrefixes.map(
		srcPrefix =>
			srcPrefix.endsWith(path.sep) ? srcPrefix : srcPrefix + path.sep
	);
}
