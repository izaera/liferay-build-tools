import template from 'babel-template';

const buildDefine = template(`
  define(DEPS, function(module, exports, require) {
		SOURCE
	})
`);

export default function({ types: t }) {
	return {
		visitor: {
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

							state.dependencies[moduleName] = moduleName;
						}
					}
				}
			},
			Program: {
				enter(path, state) {
					state.dependencies = {};
				},
				exit(path, { dependencies }) {
					const node = path.node;
					const body = node.body;

					Object.assign(dependencies, {
						module: 'module',
						exports: 'exports',
						require: 'require',
					});

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
