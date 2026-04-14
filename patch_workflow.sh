sed -i 's/uses: actions\/cache@v3/uses: actions\/cache@v4/g' .github/workflows/codescan.yml
sed -i '/runs-on: ubuntu-latest/a \        env:\n          FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true' .github/workflows/codescan.yml
