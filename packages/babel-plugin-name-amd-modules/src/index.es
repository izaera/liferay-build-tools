// TODO: check for global context
// TODO: make paths separators work for Windoze
// TODO: make paths work in case insensitive file systems

import path from 'path';
import readJsonSync from 'read-json-sync';

/**
 * options:
 *	  packageName: '<package.json>'
 *		sourceRoot:	 'src/main/resources/META-INF/resources/'
 */
export default function({ types: t }) {
	const namespaceVisitor = {
		ExpressionStatement({ node }) {
			const expression = node.expression;

			if (t.isCallExpression(expression)) {
				const callee = expression.callee;

				if (t.isIdentifier(callee, { name: 'define' })) {
					const args = expression.arguments;

					let insertName = false;

					switch (args.length) {
						case 1:
							insertName = t.isFunctionExpression(args[0]);
							break;

						case 2:
							insertName =
								t.isArrayExpression(args[0]) &&
								t.isFunctionExpression(args[1]);
							break;
					}

					if (insertName) {
						const filenameRelative = this.opts._filenameRelative;
						let sourceRoot =
							this.opts.sourceRoot ||
							'src/main/resources/META-INF/resources/';

						if (!sourceRoot.endsWith('/')) {
							sourceRoot += '/';
						}

						let moduleName;

						if (filenameRelative.startsWith(sourceRoot)) {
							moduleName = filenameRelative.substring(
								sourceRoot.length
							);

							if (moduleName.toLowerCase().endsWith('.js')) {
								moduleName = moduleName.substring(
									0,
									moduleName.length - 3
								);
							}

							let packageName =
								this.opts.packageName || '<package.json>';

							if (packageName == '<package.json>') {
								const pkgJson = getPackageJson(
									filenameRelative
								);

								packageName = `${pkgJson.name}@${pkgJson.version}/`;
							}

							if (!packageName.endsWith('/')) {
								sourceRoot += '/';
							}

							args.unshift(
								t.stringLiteral(`${packageName}${moduleName}`)
							);
						}
					}
				}
			}
		},
	};

	const visitor = {
		Program: {
			exit(path, state) {
				const opts = Object.assign({}, state.opts, {
					_filenameRelative: state.file.opts.filenameRelative,
				});

				path.traverse(namespaceVisitor, { opts });
			},
		},
	};

	return {
		visitor: visitor,
	};
}

function getPackageJson(modulePath) {
	let pkgJson = null;
	let pkgJsonDir = path.resolve(modulePath);

	while (pkgJson == null && pkgJsonDir != '') {
		pkgJsonDir = path.parse(pkgJsonDir).dir;
		try {
			pkgJson = readJsonSync(`${pkgJsonDir}/package.json`);
		} catch (err) {}
	}

	return pkgJson;
}
