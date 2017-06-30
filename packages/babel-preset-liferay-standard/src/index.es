import babelPluginNormalizeRequires from 'babel-plugin-normalize-requires';
import babelPluginShimNodeVars from 'babel-plugin-shim-node-vars';
import babelPluginWrapModulesAmd from 'babel-plugin-wrap-modules-amd';
import babelPluginNameAmdModules from 'babel-plugin-name-amd-modules';
import babelPluginNamespaceAmdDefine from 'babel-plugin-namespace-amd-define';

export default function(context, opts = {}) {
	return {
		plugins: [
			babelPluginNormalizeRequires,
			babelPluginShimNodeVars,
			babelPluginWrapModulesAmd,
			babelPluginNameAmdModules,
			babelPluginNamespaceAmdDefine,
		],
	};
}
