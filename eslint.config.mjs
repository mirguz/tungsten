import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
	{
		ignores: [
			"**/dist/**",
			"**/.turbo/**",
			"**/coverage/**"
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: [
			"**/*.mjs",
			"**/tsup.config.ts",
			"vitest.config.ts",
			"vitest.setup.ts"
		],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: [
			"**/*.{ts,tsx}"
		],
		plugins: {
			react,
			"react-hooks": reactHooks
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				},
			},
		},
		settings: {
			react: {
				version: "detect"
			}
		},
		rules: {
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			"react/react-in-jsx-scope": "off",
			"react/prop-types": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn", {
					argsIgnorePattern: "^_"
				}
			],
		},
	},
	prettier,
);
