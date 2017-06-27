import template from 'babel-template';
import fs from 'fs';
import path from 'path';
import readJsonSync from 'read-json-sync';

// List of built-in Node.js v7.10.0 globals.
// Get the full list from https://nodejs.org/docs/latest/api/globals.html
var defaultNodeGlobals = {
	Buffer: "var Buffer = require('liferay-node-buffer');",
	__dirname: function(file) {
		var dirname = file.path.substring(
			process.cwd().length + srcDir.length + 1
		);
		dirname = dirname.substring(0, dirname.lastIndexOf('/'));
		return "var __dirname = '" + dirname + "';";
	},
	__filename: function(file) {
		var filename = file.path.substring(
			process.cwd().length + srcDir.length + 1
		);
		return "var __filename = '" + filename + "';";
	},
	clearImmediate: "require('liferay-node-setimmediate');",
	//clearInterval: already provided by the browser
	//clearTimeout: already provided by the browser
	//console: already provided by the browser
	global: 'var global = window;',
	process: "var process = require('liferay-node-process');",
	setImmediate: "require('liferay-node-setimmediate');",
	//setInterval: already provided by the browser
	//setTimeout: already provided by the browser
};

// List of built-in Node.js v7.10.0 modules.
// Get the full list from https://nodejs.org/docs/latest/api/index.html
// Or alternatively: https://github.com/sindresorhus/builtin-modules
// A good place to look for shims is:
// https://github.com/substack/node-browserify/blob/master/lib/builtins.js
var defaultNodeModules = {
	assert: 'liferay-node-assert',
	buffer: 'liferay-node-buffer',
	child_process: 'liferay-node-child_process',
	cluster: 'liferay-node-cluster',
	console: 'liferay-node-console',
	constants: 'liferay-node-constants',
	crypto: 'liferay-node-crypto',
	dgram: 'liferay-node-dgram',
	dns: 'liferay-node-dns',
	domain: 'liferay-node-domain',
	events: 'liferay-node-events',
	fs: 'liferay-node-fs',
	http: 'liferay-node-http',
	https: 'liferay-node-https',
	module: 'liferay-node-module',
	net: 'liferay-node-net',
	os: 'liferay-node-os',
	path: 'liferay-node-path',
	process: 'liferay-node-process',
	punycode: 'liferay-node-punycode',
	querystring: 'liferay-node-querystring',
	readline: 'liferay-node-readline',
	repl: 'liferay-node-repl',
	stream: 'liferay-node-stream',
	string_decoder: 'liferay-node-string_decoder',
	timers: 'liferay-node-timers',
	tls: 'liferay-node-tls',
	tty: 'liferay-node-tty',
	url: 'liferay-node-url',
	util: 'liferay-node-util',
	v8: 'liferay-node-v8',
	vm: 'liferay-node-vm',
	zlib: 'liferay-node-zlib',
};

/**
 * options:
 *    nodeShimsVersion: '1.0.0'
 *	  globals: {}
 *    modules: {}
 */
export default function({ types: t }) {
	return {
		visitor: {
			Identifier(path, state) {
				if (shimModule(t, path, state)) return;
				if (shimGlobal(t, path, state)) return;
			},
			Program: {
				enter(path, state) {
					state.moduleShims = {};
					state.globalShims = {};
				},
				exit({ node }, state) {
					const filenameRelative = state.file.opts.filenameRelative;
					const globalShims = state.globalShims;
					const moduleShims = state.moduleShims;

					patchProgram(node, globalShims);

					patchPackageJson(
						getPackageJsonPath(filenameRelative),
						moduleShims
					);
				},
			},
		},
	};
}

function shimGlobal(t, { node, parent }, { opts, globalShims, moduleShims }) {
	const nodeShimsVersion = opts.nodeShimsVersion || '1.0.0';
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

		globalShims[node.name] = shim;

		const match = shim.match(/.*require\((.*)\).*/);
		if (match.length == 2) {
			let moduleName = match[1];
			moduleName = moduleName.replace(/'/g, '');
			moduleName = moduleName.replace(/"/g, '');

			moduleShims[moduleName] = nodeShimsVersion;
		}

		return true;
	}

	return false;
}

function shimModule(t, { node, parent }, { opts, moduleShims }) {
	const nodeShimsVersion = opts.nodeShimsVersion || '1.0.0';
	const nodeModules = opts.modules || defaultNodeModules;

	if (node.name == 'require' && t.isCallExpression(parent)) {
		const argument = parent.arguments[0];

		if (t.isLiteral(argument) && argument.value) {
			const moduleName = argument.value;
			const nodeModule = nodeModules[moduleName];

			if (nodeModule) {
				argument.value = nodeModule;
				moduleShims[nodeModule] = nodeShimsVersion;
			}

			return true;
		}
	}

	return false;
}

function patchProgram(program, globalShims) {
	Object.keys(globalShims).forEach(key => {
		const buildShim = template(globalShims[key]);

		program.body.unshift(buildShim());
	});
}

function patchPackageJson(pkgJsonPath, moduleShims) {
	const moduleShimNames = Object.keys(moduleShims);

	if (moduleShimNames.length > 0) {
		const pkgJson = readJsonSync(pkgJsonPath);
		let modified = false;

		pkgJson.dependencies = pkgJson.dependencies || {};

		moduleShimNames.forEach(moduleShimName => {
			if (!pkgJson.dependencies[moduleShimName]) {
				pkgJson.dependencies[moduleShimName] =
					moduleShims[moduleShimName];

				modified = true;
			}
		});

		if (modified) {
			fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
		}
	}
}

function getPackageJsonPath(modulePath) {
	var dir = path.dirname(modulePath);

	while (true) {
		try {
			fs.statSync(dir + '/package.json');
			break;
		} catch (err) {}

		dir = path.dirname(dir);

		if (dir == '/') {
			throw new Error('Cannot find package.json for file: ' + path);
		}
	}

	return dir + '/package.json';
}
