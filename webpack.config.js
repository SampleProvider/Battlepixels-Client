import path from "path";
// const path = require("path");


export default {
  entry: ["./src/ts/game/game.ts", "./src/ts/game/chat.ts", "./src/ts/menu/menu.ts"],
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
  output: {
    filename: "bundle.js",
    path: path.resolve(import.meta.dirname, "dist"),
  },
};