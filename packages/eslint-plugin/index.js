import selectRequiresItems from "./rules/select-requires-items.js";

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
  meta: {
    name: "@workspace",
  },
  rules: {
    "select-requires-items": selectRequiresItems,
  },
};

export default plugin;
