import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const privateWorkspaceImport = {
  group: ["@campusmarkt/*/src", "@campusmarkt/*/src/**"],
  message:
    "ARCH_PRIVATE_WORKSPACE_IMPORT: import the workspace package public entry point.",
};

const identityPortableImport = {
  group: ["@supabase/**", "nodemailer", "sharp", "server-only"],
  message:
    "ARCH_IDENTITY_PORTABLE: portable identity packages cannot import server providers or server-only adapters.",
};

const identityProviderAdapterImport = {
  group: ["@supabase/**", "nodemailer", "sharp"],
  message:
    "ARCH_IDENTITY_PROVIDER_ADAPTER: identity providers may be imported only by identity infrastructure adapters.",
};

const identityServerOnlyImport = {
  group: ["server-only"],
  message:
    "ARCH_IDENTITY_SERVER_ONLY: the server-only marker is forbidden in pages, client UI, and portable application code.",
};

const presentationInfrastructureImport = {
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
};

const identitySecretRestrictions = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
  "IDENTITY_HASH_PEPPER",
  "SMTP_PASS",
].map((name) => ({
  selector: `MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env'][property.name='${name}']`,
  message:
    "ARCH_IDENTITY_SECRET_BOUNDARY: identity secrets may be read only by identity infrastructure modules.",
}));

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
                "apps/**",
                "infra/**",
              ],
              message:
                "ARCH_DOMAIN_FRAMEWORK: domain code cannot import framework, presentation, provider, or infrastructure modules.",
            },
            identityPortableImport,
          ],
        },
      ],
    },
  },
  {
    files: [
      "packages/validation/**/*.ts",
      "packages/types/**/*.ts",
      "packages/api-client/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [privateWorkspaceImport, identityPortableImport],
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
            presentationInfrastructureImport,
            identityProviderAdapterImport,
            identityServerOnlyImport,
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...identitySecretRestrictions],
    },
  },
  {
    files: [
      "apps/web/src/modules/identity/application/**/*.{ts,tsx}",
      "apps/web/src/modules/identity/ui/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            privateWorkspaceImport,
            identityProviderAdapterImport,
            identityServerOnlyImport,
          ],
        },
      ],
      "no-restricted-syntax": ["error", ...identitySecretRestrictions],
    },
  },
  {
    files: ["apps/web/src/modules/identity/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [privateWorkspaceImport, identityProviderAdapterImport],
        },
      ],
      "no-restricted-syntax": ["error", ...identitySecretRestrictions],
    },
  },
  {
    files: ["apps/web/src/modules/identity/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [privateWorkspaceImport],
        },
      ],
    },
  },
);
