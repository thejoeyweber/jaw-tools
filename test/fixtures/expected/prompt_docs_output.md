# Prompt Variable Documentation

This document lists all unique variables found across prompt templates.

| Variable (Raw) | Key / Path | Type | Filters / Pattern | Default(s) | Used In Template(s) |
|----------------|------------|------|-------------------|------------|---------------------|
| `{{/files/must_exist.txt}}` | `/files/must_exist.txt` | file | — | — | `test/fixtures/templates/filters_and_validation.md` |
| `{{/files/name.txt}}` | `/files/name.txt` | file | — | — | `test/fixtures/templates/simple_file.md` |
| `{{/files/nonexistent_for_validation.json}}` | `/files/nonexistent_for_validation.json` | file | — | — | `test/fixtures/templates/filters_and_validation.md` |
| `{{$MY_TEST_ENV_VAR}}` | `MY_TEST_ENV_VAR` | MY_TEST_ENV_VAR | — | — | `test/fixtures/templates/env_var.md` |
| `{{$fileData:toUpperCase /files/data.txt}}` | `fileData` | fileData | `:toUpperCase` | — | `test/fixtures/templates/filters_and_validation.md` |
| `{{$greeting|default=Hello Universe}}` | `greeting` | greeting | — | Hello Universe | `test/fixtures/templates/default_var.md` |
| `{{$myConfigVar:someArg|default=Fallback}}` | `myConfigVar` | myConfigVar | `:someArg` | Fallback | `test/fixtures/templates/custom_var_config.md` |
