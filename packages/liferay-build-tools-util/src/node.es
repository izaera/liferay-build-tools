// TODO: move this to shim-nodejs plugin and decouple node-vars or use babel-plugin-transform-node-env-inline

import { getPackageDir } from './index';

// List of built-in Node.js v7.10.0 globals.
// Get the full list from https://nodejs.org/docs/latest/api/globals.html
export const defaultGlobals = {
	Buffer: "var Buffer = require('liferay-node-buffer');",
	__dirname: function(filePath) {
		const pkgDir = getPackageDir(filePath);

		let dirname = filePath.substring(pkgDir.length + 1);
		dirname = dirname.substring(0, dirname.lastIndexOf('/'));

		return `var __dirname = '${dirname}';`;
	},
	__filename: function(filePath) {
		const pkgDir = getPackageDir(filePath);

		let filename = filePath.substring(pkgDir.length + 1);

		return `var __filename = '${filename}';`;
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
export const defaultModules = {
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
