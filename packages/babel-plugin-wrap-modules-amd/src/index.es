import template from 'babel-template';

const buildDefine = template(`
  define(['module', 'exports', 'require'], function(module, exports, require) {
		SOURCE
	})
`);

export default function({ types: t }) {
	return {
		visitor: {
			Program: {
				exit(path, state) {
					const node = path.node;
					const body = node.body;

					node.body = [
						buildDefine({
							SOURCE: body,
						}),
					];
				},
			},
		},
	};
}
