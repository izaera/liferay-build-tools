import { getPackageDir } from 'liferay-build-tools-util';
import readJsonSync from 'read-json-sync';
import resolveModule from 'resolve';

let pluginsBaseDir = '.';
let config = loadConfig();

function loadConfig() {
	let config = readJsonSync('.npmbundlerrc');

	if (config.preset) {
		const presetFile = resolveModule.sync(config.preset, {
			basedir: '.',
		});

		config = Object.assign(readJsonSync(presetFile), config);
		pluginsBaseDir = getPackageDir(presetFile);
	}

	return config;
}

function configRequire(module) {
	const pluginFile = resolveModule.sync(module, {
		basedir: pluginsBaseDir,
	});

	return require(pluginFile);
}

export function getOutputDir() {
	return config['output'] || 'build/resources/main/META-INF/resources';
}

export function getExclusions(pkg) {
	let exclusions = config.exclude || {};

	exclusions = exclusions[pkg.id] || exclusions[pkg.name] || [];

	return exclusions;
}

export function loadBabelPlugins(presets, plugins) {
	// TOOD: if plugins have config decide what to do with it
	return []
		.concat(
			...presets.map(preset => {
				let presetModule;

				try {
					presetModule = configRequire(preset);
				} catch (err) {
					presetModule = configRequire(`babel-preset-${preset}`);
				}

				return presetModule.default().plugins;
			})
		)
		.concat(...plugins);
}

export function getPlugins(phase, pkg) {
	const pluginsKey = phase === 'pre' ? 'plugins' : 'post-plugins';

	let plugins = [];

	if (config[pkg.id] && config[pkg.id][pluginsKey]) {
		plugins = config[pkg.id][pluginsKey];
	} else if (config['*'] && config['*'][pluginsKey]) {
		plugins = config['*'][pluginsKey];
	}

	return plugins.map(pluginName => {
		let pluginConfig = {};

		if (Array.isArray(pluginName)) {
			pluginConfig = pluginName[1];
			pluginName = pluginName[0];
		}

		const pluginModule = configRequire(
			`liferay-npm-bundler-plugin-${pluginName}`
		);

		return {
			run: pluginModule.default,
			config: pluginConfig,
		};
	});

	return plugins;
}

export function getBabelConfig(pkg) {
	let babelConfig = {};

	if (config[pkg.id] && config[pkg.id]['.babelrc']) {
		babelConfig = config[pkg.id]['.babelrc'];
	} else if (config['*'] && config['*']['.babelrc']) {
		babelConfig = config['*']['.babelrc'];
	}

	return babelConfig;
}
