// TODO: have a look at use babel-plugin-transform-node-env-inline to get rid of this plugin

import template from 'babel-template';
import { getPackageJsonPath } from 'liferay-build-tools-util';
import * as node from 'liferay-build-tools-util/lib/node';

var nodeGlobals = {
	__dirname: node.defaultGlobals.__dirname,
	__filename: node.defaultGlobals.__filename,
	global: node.defaultGlobals.global,
	process: "var process = {env:{NODE_ENV: 'production'}};",
};

export default function({ types: t }) {
	return {
		visitor: {
			Identifier({ node, parent }, { file, shims }) {
				let capture = false;

				if (t.isMemberExpression(parent)) {
					capture = parent.object === node;
				} else if (t.isVariableDeclarator(parent)) {
					capture = parent.id !== node;
				} else {
					capture = true;
				}

				if (
					capture &&
					nodeGlobals.hasOwnProperty(node.name) &&
					nodeGlobals[node.name] != null
				) {
					var shim = nodeGlobals[node.name];

					if (typeof shim == 'function') {
						shim = shim(file.opts.filenameRelative);
					}

					shims[node.name] = shim;
				}
			},
			Program: {
				enter(path, state) {
					state.shims = {};
				},
				exit({ node }, { opts, shims }) {
					const env = opts.env || 'production';

					Object.keys(shims).forEach(key => {
						const buildShim = template(shims[key]);

						node.body.unshift(buildShim());
					});
				},
			},
		},
	};
}
