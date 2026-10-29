import path from "node:path"

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : undefined
const tsconfigPath = path.resolve(import.meta.dirname, "../../tsconfig.json")
const preloadPath = path.resolve(
  import.meta.dirname,
  "../../../../node_modules/.bun/@opentui+solid@0.7.0+955bd0e0a59cdfb4/node_modules/@opentui/solid/scripts/preload.js",
)

export function selfCommand() {
  const runtime = path.basename(process.execPath, path.extname(process.execPath)).toLowerCase()
  if (runtime !== "bun" && runtime !== "node" && runtime !== "nodejs") return [process.execPath]
  if (!entrypoint) throw new Error("Failed to resolve CLI entrypoint")
  if (runtime === "node" || runtime === "nodejs") return [process.execPath, ...nodeFlags(), entrypoint]
  return [
    process.execPath,
    "--conditions=browser",
    "-r",
    preloadPath,
    "--tsconfig-override",
    tsconfigPath,
    entrypoint,
  ]
}

function nodeFlags() {
  return process.execArgv.flatMap((arg, index, args) => {
    if (index > 0 && args[index - 1] === "--conditions") return []
    if (arg === "--conditions") return args[index + 1] ? [arg, args[index + 1]] : []
    if (arg.startsWith("--conditions=")) return [arg]
    if (
      arg === "--experimental-ffi" ||
      arg === "--use-system-ca" ||
      arg === "--enable-source-maps" ||
      arg === "--no-addons"
    )
      return [arg]
    if (arg === "--no-warnings" || arg.startsWith("--disable-warning=")) return [arg]
    return []
  })
}
