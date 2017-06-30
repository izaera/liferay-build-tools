import template from 'babel-template';
import fs from 'fs';
import { getPackageJsonPath } from 'liferay-build-tools-util';
import * as nodejs from 'liferay-build-tools-util/lib/node';
import path from 'path';
import readJsonSync from 'read-json-sync';

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

function shimGlobal(
	t,
	{ node, parent },
	{ file, opts, globalShims, moduleShims }
) {
	const nodeShimsVersion = opts.nodeShimsVersion || '1.0.0';
	const nodeGlobals = opts.globals || nodejs.defaultGlobals;
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
	const nodeModules = opts.modules || nodejs.defaultModules;

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
