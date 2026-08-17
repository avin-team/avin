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
    ".claude",
    ".agents",
    ".commandcode",
  ],
  jsPlugins: ["@workspace/eslint-plugin"],
  rules: {
    "@workspace/select-requires-items": "error",
    "github/filenames-match-regex": "off",
    "no-await-in-loop": "off",
    "promise/avoid-new": "off",
    "promise/prefer-await-to-callbacks": "off",
    "react-doctor/async-await-in-loop": "off",
    // Supabase realtime channel subscriptions are torn down via
    // channel.unsubscribe()/removeChannel() in effect cleanups, but the
    // rule's static analysis cannot match those release calls.
    "react-doctor/effect-needs-cleanup": "off",
    "react-doctor/nextjs-no-img-element": "off",
    "react-doctor/no-giant-component": "off",
    // Charts are already code-split behind React.lazy() boundaries; the
    // rule cannot see that the heavy imports live in lazily-loaded modules.
    "react-doctor/prefer-dynamic-import": "off",
    "react-doctor/react-compiler-no-manual-memoization": "off",
    "react/jsx-no-constructed-context-values": "off",
    // apps/admin/src/lib/cookies.ts is the single deliberate
    // document.cookie wrapper (replaces the js-cookie dependency).
    "unicorn/no-document-cookie": "off",
  },
});
