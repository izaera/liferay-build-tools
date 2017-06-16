// TODO: check for global context

/**
 * options:
 *		namespace: 'Liferay.Loader'
 */
export default function({ types: t }) {
	const namespaceVisitor = {
		ExpressionStatement({ node }) {
			const expression = node.expression;

			if (t.isCallExpression(expression)) {
				const callee = expression.callee;

				if (t.isIdentifier(callee, { name: 'define' })) {
					const namespace = this.opts.namespace || 'Liferay.Loader';

					callee.name = `${namespace}.define`;
				}
			}
		},
	};

	const visitor = {
		Program: {
			exit(path, { opts }) {
				path.traverse(namespaceVisitor, { opts });
			},
		},
	};

	return {
		visitor: visitor,
	};
}
