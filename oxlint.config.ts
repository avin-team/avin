import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import jsPlugins from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

const selectedJsPluginNames = new Set(["react-doctor", "github"]);
const selectedJsPluginRulePrefixes = new Set(["react-doctor", "github"]);

const selectedJsPlugins = {
  ...jsPlugins,
  jsPlugins: jsPlugins.jsPlugins?.filter((plugin) => {
    const name =
      typeof plugin === "string" ? plugin : (plugin.name ?? plugin.specifier);
    return selectedJsPluginNames.has(name);
  }),
  overrides: jsPlugins.overrides?.map((override) => ({
    ...override,
    rules: Object.fromEntries(
      Object.entries(override.rules ?? {}).filter(([ruleName]) =>
        selectedJsPluginRulePrefixes.has(ruleName.split("/")[0] ?? ruleName)
      )
    ),
  })),
  rules: Object.fromEntries(
    Object.entries(jsPlugins.rules ?? {}).filter(([ruleName]) =>
      selectedJsPluginRulePrefixes.has(ruleName.split("/")[0] ?? ruleName)
    )
  ),
};

export default defineConfig({
  extends: [core, react, tanstack, selectedJsPlugins],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    "packages/ui/**",
    "apps/admin/src/assets/**",
  ],
  jsPlugins: ["@workspace/eslint-plugin"],
  rules: {
    "@workspace/select-requires-items": "error",
    "github/filenames-match-regex": "off",
    "oxc/no-barrel-file": "off",
    "unicorn/no-abusive-eslint-disable": "off",
    "react-doctor/nextjs-no-img-element": "off",
    "react-doctor/use-lazy-motion": "off",
    "react-doctor/only-export-components": "off",
    "react-doctor/no-giant-component": "off",
    "eslint/arrow-body-style": "off",
    "eslint/complexity": "off",
    "react-doctor/react-compiler-no-manual-memoization": "off",
    "react-doctor/prefer-use-effect-event": "off",
    "eslint/sort-keys": "off",
    "github/a11y-no-title-attribute": "off",
    "unicorn/no-useless-undefined": "off",
    "jsx-a11y/label-has-associated-control": "off",
  },
});
