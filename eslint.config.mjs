import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const privateWorkspaceImport = {
  group: ["@campusmarkt/*/src", "@campusmarkt/*/src/**"],
  message:
    "ARCH_PRIVATE_WORKSPACE_IMPORT: import the workspace package public entry point.",
};

export default tseslint.config(
  {
    ignores: ["**/.next/**", "**/node_modules/**", "infra/supabase/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [privateWorkspaceImport],
        },
      ],
    },
  },
  {
    files: ["packages/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            privateWorkspaceImport,
            {
              group: [
                "next",
                "next/**",
                "react",
                "react/**",
                "@supabase/**",
                "apps/**",
                "infra/**",
              ],
              message:
                "ARCH_DOMAIN_FRAMEWORK: domain code cannot import framework, presentation, provider, or infrastructure modules.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            privateWorkspaceImport,
            {
              group: [
                "../infrastructure",
                "../infrastructure/**",
                "../../infrastructure",
                "../../infrastructure/**",
                "../../../infrastructure",
                "../../../infrastructure/**",
                "@/infrastructure",
                "@/infrastructure/**",
              ],
              message:
                "ARCH_PRESENTATION_INFRASTRUCTURE: presentation code cannot import infrastructure adapters directly.",
            },
          ],
        },
      ],
    },
  },
);
