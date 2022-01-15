# Release

## Options

* `github`, `core`, `context` (all required) from `actions/github-script`
* `version` - (required) should be semver, e.g., `1.2.3`.
* `template` - (optional) path to a release template


# .YML Configuration

Create a .yml file in your repository at `./.github/workflows/release.yml`.

```yml
# Manually triggered Workflow
name: 'Release'

env:
  # Modify the following as defined by the repository.
  DEFAULT_PACKAGE_FILE: ./package.json
  TEMP_CHECKOUT_DIRECTORY: ./.github/temp # add to .gitignore
  RELEASE_TEMPLATE: ./.github/RELEASE_TEMPLATE/release.md

on:
  workflow_dispatch:
    inputs:
      release_branch:
        description: 'Release Branch'
        default: master
        required: true
      release_type:
        type: choice
        description: 'Release Type'
        required: true
        default: prerelease
        options: 
        - prerelease
        - production

jobs:
  release_job:
    runs-on: ubuntu-latest
    name: 'release job'
    steps:
      - uses: actions/checkout@v2
        with:
          ref: ${{ github.event.inputs.release_branch }}
      - name: Get automation repo
        uses: actions/checkout@v2
        with:
          repository: herereadthis/loamscript
          ref: main
          path: ${{ env.TEMP_CHECKOUT_DIRECTORY }}/loamscript
      - name: Github Script
        uses: actions/github-script@v5
        env:
          branch: ${{ github.event.inputs.release_branch }}
          release_type: ${{ github.event.inputs.release_type }}
        with:
          script: |
            const {version} = require('${{ env.DEFAULT_PACKAGE_FILE }}')
            const script = require('${{ env.TEMP_CHECKOUT_DIRECTORY }}/loamscript/release/index.js')
            const template = '${{ env.RELEASE_TEMPLATE }}'
            await script({github, context, core, version, template})
```

## Resources

* [github-script](https://github.com/actions/github-script) - for using Github API, (e.g. github, core, context)
* [plugin-rest-endpoint-methods.js](https://github.com/octokit/plugin-rest-endpoint-methods.js) - github API endpoints