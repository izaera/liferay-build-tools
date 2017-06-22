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
	const nameVisitor = {
		ExpressionStatement(path) {
			const node = path.node;
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

							path.stop();
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

				// We must traverse the AST again because the third party
				// transform-es2015-modules-amd emits its define() call after
				// Program exit :-(
				path.traverse(nameVisitor, { opts });
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
