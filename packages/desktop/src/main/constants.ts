import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.OPENCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())

const appNames: Record<string, string> = {
  dev: "Rovie Code Dev",
  beta: "Rovie Code Beta",
  prod: "Rovie Code",
}

const appIDs: Record<string, string> = {
  dev: "africa.rovie.code.dev",
  beta: "africa.rovie.code.beta",
  prod: "africa.rovie.code",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "Rovie Code Dev"

export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "africa.rovie.code.dev"
