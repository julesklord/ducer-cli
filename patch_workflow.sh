#!/bin/bash
# replace cache@v3
find .github/workflows -type f -name "*.yml" -exec sed -i 's/uses: actions\/cache@v3/uses: actions\/cache@v4/g' {} +
# replace actions/checkout@v3 with @v4
find .github/workflows -type f -name "*.yml" -exec sed -i 's/uses: actions\/checkout@v3/uses: actions\/checkout@v4/g' {} +
# replace actions/setup-node@v3/v4 pinned hashes to latest @v4
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020'/uses: 'actions\/setup-node@v4'/g" {} +
# cache pinned
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'actions\/cache@0057852bfaa89a56745cba8c7296529d2fc39830'/uses: 'actions\/cache@v4'/g" {} +
# checkout pinned
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'actions\/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8'/uses: 'actions\/checkout@v4'/g" {} +
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'actions\/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5'/uses: 'actions\/checkout@v4'/g" {} +
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'actions\/checkout@08eba0b27e820071cde6df949e0beb9ba4906955'/uses: 'actions\/checkout@v4'/g" {} +
# test-reporter
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'dorny\/test-reporter@dc3a92680fcc15842eef52e8c4606ea7ce6bd3f3'/uses: 'dorny\/test-reporter@v1.9.1'/g" {} +
# upload-artifact
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02'/uses: 'actions\/upload-artifact@v4'/g" {} +
# codeql
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'github\/codeql-action\/init@df559355d593797519d70b90fc8edd5db049e7a2'/uses: 'github\/codeql-action\/init@v3'/g" {} +
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'github\/codeql-action\/analyze@df559355d593797519d70b90fc8edd5db049e7a2'/uses: 'github\/codeql-action\/analyze@v3'/g" {} +
# compressed-size-action
find .github/workflows -type f -name "*.yml" -exec sed -i "s/uses: 'preactjs\/compressed-size-action@946a292cd35bd1088e0d7eb92b69d1a8d5b5d76a'/uses: 'preactjs\/compressed-size-action@v2'/g" {} +
