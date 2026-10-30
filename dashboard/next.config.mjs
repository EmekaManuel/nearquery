// Static export for GitHub Pages. Set NEXT_PUBLIC_BASE_PATH=/<repo> when hosting under a project path.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export default { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } };
