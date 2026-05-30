class ThrowErrorsPlugin {
  apply(compiler) {
    compiler.hooks.emit.tap("ThrowErrorsPlugin", (compilation) => {
      // Iterate over all compiled assets
      for (const assetName in compilation.assets) {
        if (assetName.endsWith('.js')) { // Only target JS files
          const source = compilation.assets[assetName].source();
          // Create a modified source (example: replace "oldText" with "newText")
          const modifiedSource = source.replaceAll("catch(e) { __webpack_async_result__(e); }", "catch(e) { console.error(e); __webpack_async_result__(e); }");
          
          // Update the asset with the modified source
          compilation.assets[assetName] = new compiler.webpack.sources.RawSource(modifiedSource);
        }
      }
    });
  }
}

export default ThrowErrorsPlugin;