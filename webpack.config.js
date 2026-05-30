import path from "path";
import ThrowErrorsPlugin from "./throw-errors-plugin.js";

export default {
  entry: ["./src/ts/game/game.ts", "./src/ts/ui/chat.ts", "./src/ts/ui/inventory.ts", "./src/ts/ui/dialogue.ts"],
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    extensionAlias: {
        ".js": [".js", ".ts"],
    },
  },
  plugins: [ new ThrowErrorsPlugin() ],
  output: {
    filename: "bundle.js",
    path: path.resolve(import.meta.dirname, "dist"),
  },
};