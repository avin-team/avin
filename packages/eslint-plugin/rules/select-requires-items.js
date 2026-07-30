const SELECT_IMPORT_SOURCES = new Set(["@workspace/ui/components/select"]);

/** @param {string} source Module specifier from an import declaration. */
const isSelectImportSource = (source) => {
  if (SELECT_IMPORT_SOURCES.has(source)) {
    return true;
  }

  return /(?:^|\/)select$/u.test(source.replace(/\.tsx?$/u, ""));
};

/** @type {import('eslint').Rule.RuleModule} */
const selectRequiresItems = {
  create(context) {
    /** @type {Set<string>} */
    const selectIdentifiers = new Set();

    return {
      ImportDeclaration(node) {
        if (!isSelectImportSource(node.source.value)) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === "Select"
          ) {
            selectIdentifiers.add(specifier.local.name);
          }
        }
      },
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") {
          return;
        }

        if (!selectIdentifiers.has(node.name.name)) {
          return;
        }

        let hasItems = false;

        for (const attribute of node.attributes) {
          if (attribute.type === "JSXSpreadAttribute") {
            hasItems = true;
            break;
          }

          if (
            attribute.type === "JSXAttribute" &&
            attribute.name.type === "JSXIdentifier" &&
            attribute.name.name === "items"
          ) {
            hasItems = true;
            break;
          }
        }

        if (!hasItems) {
          context.report({
            messageId: "missingItems",
            node,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Require items prop on Select from @workspace/ui (Base UI, not Radix)",
    },
    messages: {
      missingItems: [
        "Base UI Select requires an `items` prop. This repo uses @base-ui/react Select (not Radix). Without `items`, SelectValue shows wrong or missing label text.",
        "",
        "Fix:",
        '1. Define `const items = [{ label: "…", value: "…" }, …]` — use `{ label: "Placeholder", value: null }` for empty state (not `<SelectValue placeholder>`; that is the Radix pattern).',
        "2. Pass `items={items}` on `<Select>`.",
        "3. Map the same array to `<SelectItem>` children inside `<SelectGroup>`.",
        "",
        "Docs: .cursor/.agents/skills/shadcn/rules/base-vs-radix.md (Select section)",
        "Component: packages/ui/src/components/select.tsx",
      ].join("\n"),
    },
    schema: [],
    type: "problem",
  },
};

export default selectRequiresItems;
