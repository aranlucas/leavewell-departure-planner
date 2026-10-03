# Provenance

Source: https://github.com/dmmulroy/anti-slop

Exact commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`. Production assets copied unmodified from `skills/install-anti-slop/assets/anti-slop/` to `tools/oxlint/anti-slop/`. Root MIT license and nested ESLint Stylistic LICENSE/UPSTREAM.md are preserved.

## Integration

Oxlint and @oxlint/plugins are exactly 1.86.0. All 18 generic custom rules plus native oxc/no-accumulating-spread are enabled. No direct Effect dependency exists. Original npm/package-lock, CI triggers, security checks and formatter configuration remain intact.

Use upstream allowInTypeGuards for genuine boundary predicates/assertions. One no-known-value-widening exception retains defensive export-boundary runtime validation for JavaScript callers. Input fields use a finite named boundary contract rather than an unsafe dictionary; validated string/number predicates remove casts. Enum UI inputs and focus restoration are checked; caught errors are handled without type assertions. The existing workflow is deliberately manual for compute-budget reasons and remains manual; it has not been triggered. Local tests, full TypeScript/build and browser checks are blocked by npm dependency download HTTP403. Diagnostic TS7 checking of domain modules found only the missing Temporal dependency; this is not a complete project typecheck.

Initial diagnostic counts: {"anti-slop(no-conditional-empty-object-spread)": 1, "anti-slop(no-known-value-widening)": 1, "anti-slop(no-runtime-typeof)": 7, "anti-slop(no-unknown-parameters)": 2, "anti-slop(no-unsafe-dictionary-type)": 1, "anti-slop(require-readable-spacing)": 241, "anti-slop(require-safety-comment-for-type-assertion)": 20}. Final lint: zero diagnostics using the matching already-verified local toolchain. Second lint-fix/format pass is byte-stable; git diff --check passes. No deployment or merge.
