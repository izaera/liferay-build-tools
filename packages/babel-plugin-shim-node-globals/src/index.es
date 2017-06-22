import template from 'babel-template';

// List of built-in Node.js v7.10.0 globals.
// Get the full list from https://nodejs.org/docs/latest/api/globals.html
var defaultNodeGlobals = {
	Buffer: "var Buffer = require('buffer');",
	__dirname: function(file) {
		var dirname = file.path.substring(process.cwd().length + srcDir.length + 1);
		dirname = dirname.substring(0, dirname.lastIndexOf('/'));
		return "var __dirname = '" + dirname + "';";
	},
	__filename: function(file) {
		var filename = file.path.substring(
			process.cwd().length + srcDir.length + 1
		);
		return "var __filename = '" + filename + "';";
	},
	clearImmediate: "require('setimmediate');",
	//clearInterval: already provided by the browser
	//clearTimeout: already provided by the browser
	//console: already provided by the browser
	global: 'var global = window;',
	process: "var process = require('process');",
	setImmediate: "require('setimmediate');",
	//setInterval: already provided by the browser
	//setTimeout: already provided by the browser
};

/**
 * options:
 *	  globals: {}
 */
export default function({ types: t }) {
	return {
		visitor: {
			Identifier({ node, parent }, state) {
				const opts = state.opts;
				const nodeGlobals = opts.globals || defaultNodeGlobals;
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
						shim = shim(file);
					}

					state.shims[node.name] = shim;
				}
			},
			Program: {
				enter(path, state) {
					state.shims = {};
				},
				exit({ node }, { shims }) {
					Object.keys(shims).forEach(key => {
						const buildShim = template(shims[key]);

						node.body.unshift(buildShim());
					});
				},
			},
		},
	};
}
