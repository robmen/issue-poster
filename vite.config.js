module.exports = {
  build: {
    emptyOutDir: true,
    outDir: "dist",
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        format: "cjs",
      },
    },
    ssr: "src/index.ts",
    target: "node20",
  },
  ssr: {
    noExternal: true,
  },
};
