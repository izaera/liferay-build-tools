import template from 'babel-template';

const buildDefine = template(`
  define(DEPS, function(module, exports, require) {
		SOURCE
	})
`);

export default function({ types: t }) {
	const requireVisitor = {
		Identifier(path, state) {
			const node = path.node;

			if (node.name === 'require') {
				const parent = path.parent;

				if (
					t.isCallExpression(parent) &&
					parent.callee === node &&
					parent.arguments.length == 1
				) {
					const argument0 = parent.arguments[0];

					if (t.isLiteral(argument0)) {
						const moduleName = argument0.value;

						this.dependencies[moduleName] = moduleName;
					}
				}
			}
		},
	};

	return {
		visitor: {
			Program: {
				exit(path, state) {
					const node = path.node;
					const body = node.body;

					let dependencies = {
						module: 'module',
						exports: 'exports',
						require: 'require',
					};

					path.traverse(requireVisitor, { dependencies });

					dependencies = Object.keys(dependencies);

					node.body = [
						buildDefine({
							SOURCE: body,
							DEPS: t.arrayExpression(
								dependencies.map(dep => t.stringLiteral(dep))
							),
						}),
					];
				},
			},
		},
	};
}
