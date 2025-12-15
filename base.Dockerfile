# Dependencies for image processing
# docker tag tiny-iiif:latest ghcr.io/mayancodical/tiny-iiif:base
FROM node:22-slim

ENV PREFIX_PATH=/usr/local \
  LIB_PATH=/usr/local/lib \
  PKG_CONFIG_PATH=/usr/local/lib/pkgconfig \
  LD_LIBRARY_PATH=/usr/local/lib \
  IIIF_IMAGE_PATH=/data

RUN apt-get update -qq && apt-get install -y curl && apt-get clean && \
  apt-get install -y build-essential pkg-config libglib2.0-dev libexpat1-dev cmake nasm pkg-config meson ninja-build \
  libglib2.0-dev libexpat1-dev libturbojpeg0-dev libpng-dev libwebp-dev \
  libexif-dev libimagequant-dev librsvg2-dev libtiff-dev liblcms2-dev libgirepository1.0-dev

# ---- cgif (Meson) ----
ARG CGIF_VERSION=0.5.0
RUN <<EOF
  curl -L "https://github.com/dloebl/cgif/archive/refs/tags/v${CGIF_VERSION}.tar.gz" | tar zx
  cd "cgif-${CGIF_VERSION}"
  meson setup build --prefix="${PREFIX_PATH}" --libdir="${LIB_PATH}" --buildtype=release
  meson compile -C build
  meson install -C build
  ldconfig
EOF

# ---- openjpeg (libopenjp2) ----
ARG LIBOPENJP2_VERSION=2.5.3
RUN <<EOF
  curl -L "https://github.com/uclouvain/openjpeg/archive/refs/tags/v${LIBOPENJP2_VERSION}.tar.gz" | tar zx
  mkdir -p "openjpeg-${LIBOPENJP2_VERSION}/build"
  cd "openjpeg-${LIBOPENJP2_VERSION}/build"
  cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_LIBDIR="${LIB_PATH}"
  make -j"$(nproc)"
  make install
EOF

# ---- libvips (Meson) ----
ARG VIPS_VERSION=8.17.3
RUN <<EOF
  curl -L "https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.xz" | tar xJ
  cd "vips-${VIPS_VERSION}"
  meson setup build --prefix="${PREFIX_PATH}" --libdir="${LIB_PATH}" --buildtype=release
  meson compile -C build
  meson install -C build
  ldconfig
EOF

RUN vips --version && pkg-config --modversion vips-cpp