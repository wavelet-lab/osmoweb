#!/usr/bin/env bash

DIST_DIR="docs.build"

# Create the distribution directory if it doesn't exist
mkdir -p "$DIST_DIR"

# Generate .rst files from README.md files
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/osmoweb.rst README.md
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/core.rst packages/core/README.md
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/backend-core.rst packages/backend-core/README.md
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/frontend-core.rst packages/frontend-core/README.md
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/nestjs-microservice.rst packages/nestjs-microservice/README.md
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/vue3-components.rst packages/vue3-components/README.md
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/test-apps.rst test-apps/README.md
pandoc -s -f gfm -t rst --wrap=preserve -o $DIST_DIR/docker.rst docker/README.md

# Update links in the generated .rst files
sed -E -i \
	-e 's|`packages/([^/]+)/README.md.*`__|:doc:`/webdev/osmoweb/\1`|g' \
	-e 's|<docs/|<https://github.com/wavelet-lab/osmoweb/tree/main/docs/|g' \
	-e 's|<packages/|<https://github.com/wavelet-lab/osmoweb/tree/main/packages/|g' \
	-e 's|<test-apps/|<https://github.com/wavelet-lab/osmoweb/tree/main/test-apps/|g' \
	"$DIST_DIR"/*.rst

echo "Docs generated."
