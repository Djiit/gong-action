# Gong Action

## Description

<!-- AUTO-DOC-DESCRIPTION:START - Do not remove or modify this section -->

Download and run gong binary from Djiit/gong releases

<!-- AUTO-DOC-DESCRIPTION:END -->

## Usage

Here is an example workflow to run Gong with this action:

```yaml
name: Run Gong

on:
  pull_request:
    branches: [main]

jobs:
  run-gong:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Gong
        uses: Djiit/gong-action@v1
        with:
          # Optional - version of `gong` to download
          version: "latest"
          # Optional - arguments to pass to `gong`
          args: "--help"
```

## Inputs

<!-- AUTO-DOC-INPUT:START - Do not remove or modify this section -->

|  INPUT  |  TYPE  | REQUIRED |  DEFAULT   |                    DESCRIPTION                    |
|---------|--------|----------|------------|---------------------------------------------------|
|  args   | string |  false   |            |             Arguments to pass to gong             |
| version | string |  false   | `"latest"` | Version of gong to download (defaults to latest)  |

<!-- AUTO-DOC-INPUT:END -->

## Outputs

<!-- AUTO-DOC-OUTPUT:START - Do not remove or modify this section -->
No outputs.
<!-- AUTO-DOC-OUTPUT:END -->

## Plateformes supportées

Cette action supporte les plateformes suivantes :

- Linux (amd64, arm64)
- macOS (amd64, arm64)
- Windows (amd64, 386)

## Développement

Pour contribuer à ce projet :

1. Cloner le dépôt
2. Installer les dépendances : `npm install`
3. Apporter vos modifications
4. Compiler l'action : `npm run build`
5. Soumettre une Pull Request

## Licence

MIT
