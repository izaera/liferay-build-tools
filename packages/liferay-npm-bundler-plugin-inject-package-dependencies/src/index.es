export default function({ srcDir, outDir, config }, { pkgJson }) {
	const pkgId = `${pkgJson.name}@${pkgJson.version}`;
	const injections = config[pkgId];

	if (injections) {
		let dependencies = pkgJson.dependencies || [];

		Object.assign(dependencies, injections);

		pkgJson.dependencies = dependencies;
	}
}
