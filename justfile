# Native QC delegation justfile.
# The client is a fork of upstream hypothesis/client and keeps upstream's native QC
# (yarn: prettier, eslint, tsc, vitest). The ai-review-ci language gates do not apply to
# this fork; only the AI review workflows run from .github/workflows/.

# List available recipes.
default:
    @just --list

# Commit-tier QC: formatting, lint, and types via upstream's yarn scripts.
test-commit:
    yarn checkformatting
    yarn lint
    yarn typecheck

# Push-tier QC: commit tier plus the full test suite.
test-push: test-commit
    yarn test

# CI-tier QC: push tier plus a production build.
test-ci: test-push
    yarn build

[private]
_test-editor:
    yarn test --grep AnnotationEditor-test

[private]
_test-save-errors:
    yarn test --grep 'fetch-test|AnnotationEditor-test'

[private]
_test-annotation-quote:
    yarn test --grep AnnotationQuote-test

[private]
_install-test-browser:
    yarn playwright install chromium

[private]
_build:
    yarn build
