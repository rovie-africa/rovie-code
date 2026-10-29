import { define } from "@opencode/plugin/effect/plugin"
import { Duration, Effect, Option, Schema, Scope } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"
import { Integration, isPlaceholderKey } from "../../integration.js"
import { Model } from "../../model.js"
import { Provider } from "../../provider.js"
import { Rpc } from "../../rpc.js"

const integrationID = Integration.ID.make("rovie")
const providerID = Provider.ID.make("rovie")
const defaultBaseURL = "https://api.rovie.africa/v1"
const defaultPortalURL = "https://route.rovie.africa"

export const RovieWalletBalance = Schema.Struct({
  availableUsd: Schema.Number,
  spendUsd: Schema.Number,
  maxBudgetUsd: Schema.NullOr(Schema.Number),
  localCurrency: Schema.String,
  availableLocal: Schema.Number,
  spendLocal: Schema.Number,
  maxBudgetLocal: Schema.NullOr(Schema.Number),
  country: Schema.String,
})
export type RovieWalletBalance = typeof RovieWalletBalance.Type

export const RovieWalletRpc = Rpc.define({
  id: "rovie.wallet",
  methods: {
    balance: {
      input: Schema.toStandardSchemaV1(Schema.Struct({})),
      output: Schema.toStandardSchemaV1(Schema.NullOr(RovieWalletBalance)),
    },
  },
  events: {
    updated: {
      schema: Schema.toStandardSchemaV1(RovieWalletBalance),
    },
  },
})

export const CURATED_ROVIE_MODELS: readonly {
  readonly litellmModelName: string
  readonly modelsDevId: string
  readonly provider: string
  readonly displayName: string
}[] = [
  // OpenAI
  { litellmModelName: "gpt-6.1-sol", modelsDevId: "openai/gpt-6.1-sol", provider: "openai", displayName: "GPT-6.1 Sol" },
  { litellmModelName: "gpt-6-astra", modelsDevId: "openai/gpt-6-astra", provider: "openai", displayName: "GPT-6 Astra" },
  { litellmModelName: "gpt-6-sol", modelsDevId: "openai/gpt-6-sol", provider: "openai", displayName: "GPT-6 Sol" },
  { litellmModelName: "gpt-6-luna", modelsDevId: "openai/gpt-6-luna", provider: "openai", displayName: "GPT-6 Luna" },
  { litellmModelName: "gpt-5.6-sol", modelsDevId: "openai/gpt-5.6-sol", provider: "openai", displayName: "GPT-5.6 Sol" },
  { litellmModelName: "gpt-5.6-terra", modelsDevId: "openai/gpt-5.6-terra", provider: "openai", displayName: "GPT-5.6 Terra" },
  { litellmModelName: "gpt-5.6-luna", modelsDevId: "openai/gpt-5.6-luna", provider: "openai", displayName: "GPT-5.6 Luna" },

  // Anthropic
  { litellmModelName: "claude-fable-5-1", modelsDevId: "anthropic/claude-fable-5-1", provider: "anthropic", displayName: "Claude Fable 5.1" },
  { litellmModelName: "claude-opus-5-5", modelsDevId: "anthropic/claude-opus-5-5", provider: "anthropic", displayName: "Claude Opus 5.5" },
  { litellmModelName: "claude-sonnet-5-5", modelsDevId: "anthropic/claude-sonnet-5-5", provider: "anthropic", displayName: "Claude Sonnet 5.5" },
  { litellmModelName: "claude-haiku-5-5", modelsDevId: "anthropic/claude-haiku-5-5", provider: "anthropic", displayName: "Claude Haiku 5.5" },
  { litellmModelName: "claude-fable-5", modelsDevId: "anthropic/claude-fable-5", provider: "anthropic", displayName: "Claude Fable 5" },
  { litellmModelName: "claude-opus-5", modelsDevId: "anthropic/claude-opus-5", provider: "anthropic", displayName: "Claude Opus 5" },
  { litellmModelName: "claude-sonnet-5", modelsDevId: "anthropic/claude-sonnet-5", provider: "anthropic", displayName: "Claude Sonnet 5" },

  // Moonshot AI
  { litellmModelName: "kimi-k3.1-pro", modelsDevId: "moonshotai/kimi-k3.1-pro", provider: "moonshotai", displayName: "Kimi K3.1 Pro" },
  { litellmModelName: "kimi-k3", modelsDevId: "moonshotai/kimi-k3", provider: "moonshotai", displayName: "Kimi K3" },
  { litellmModelName: "kimi-k2.6", modelsDevId: "moonshotai/kimi-k2.6", provider: "moonshotai", displayName: "Kimi K2.6" },

  // Google
  { litellmModelName: "gemini-4-argon", modelsDevId: "google/gemini-4-argon", provider: "google", displayName: "Gemini 4 Argon" },
  { litellmModelName: "gemini-3.8-flash", modelsDevId: "google/gemini-3.8-flash", provider: "google", displayName: "Gemini 3.8 Flash" },
  { litellmModelName: "gemini-3.7-flash", modelsDevId: "google/gemini-3.7-flash", provider: "google", displayName: "Gemini 3.7 Flash" },
  { litellmModelName: "gemini-3.6-flash", modelsDevId: "google/gemini-3.6-flash", provider: "google", displayName: "Gemini 3.6 Flash" },
  { litellmModelName: "gemini-3.5-flash-lite", modelsDevId: "google/gemini-3.5-flash-lite", provider: "google", displayName: "Gemini 3.5 Flash Lite" },
  { litellmModelName: "gemini-3.1-pro", modelsDevId: "google/gemini-3.1-pro-preview", provider: "google", displayName: "Gemini 3.1 Pro" },

  // xAI
  { litellmModelName: "grok-4.7", modelsDevId: "xai/grok-4.7", provider: "xai", displayName: "Grok 4.7" },
  { litellmModelName: "grok-4.6", modelsDevId: "xai/grok-4.6", provider: "xai", displayName: "Grok 4.6" },
  { litellmModelName: "grok-4.5", modelsDevId: "xai/grok-4.5", provider: "xai", displayName: "Grok 4.5" },
  { litellmModelName: "grok-4.3", modelsDevId: "xai/grok-4.3", provider: "xai", displayName: "Grok 4.3" },

  // DeepSeek
  { litellmModelName: "deepseek-v4-flash", modelsDevId: "deepseek/deepseek-v4-flash", provider: "deepseek", displayName: "DeepSeek V4 Flash" },
  { litellmModelName: "deepseek-v4-pro", modelsDevId: "deepseek/deepseek-v4-pro", provider: "deepseek", displayName: "DeepSeek V4 Pro" },

  // Mistral AI
  { litellmModelName: "mistral-large-4", modelsDevId: "mistral/mistral-large-4", provider: "mistral", displayName: "Mistral Large 4" },
  { litellmModelName: "mistral-medium", modelsDevId: "mistral/mistral-medium-latest", provider: "mistral", displayName: "Mistral Medium" },
  { litellmModelName: "mistral-small", modelsDevId: "mistral/mistral-small-latest", provider: "mistral", displayName: "Mistral Small" },

  // Alibaba Qwen
  { litellmModelName: "qwen3.8-max", modelsDevId: "alibaba/qwen3.8-max", provider: "alibaba", displayName: "Qwen 3.8 Max" },
  { litellmModelName: "qwen3.8-flash", modelsDevId: "alibaba/qwen3.8-flash", provider: "alibaba", displayName: "Qwen 3.8 Flash" },
  { litellmModelName: "qwen3.7-plus", modelsDevId: "alibaba/qwen3.7-plus", provider: "alibaba", displayName: "Qwen 3.7 Plus" },

  // Cohere
  { litellmModelName: "command-a-plus", modelsDevId: "cohere/command-a-plus-05-2026", provider: "cohere", displayName: "Command A+" },
]

export const RoviePlugin = define<HttpClient.HttpClient | Scope.Scope>({
  id: "opencode.provider.rovie",
  effect: Effect.fn(function* (ctx) {
    const http = yield* HttpClient.HttpClient

    yield* ctx.integration.transform((integrations) => {
      integrations.update(integrationID, (integration) => {
        integration.name = "Rovie Route"
      })
      integrations.method.update({
        integrationID,
        method: {
          type: "key",
          label: "Rovie Route API key (sk-...)",
        },
      })
      integrations.method.update({
        integrationID,
        method: {
          type: "env",
          names: ["ROVIE_API_KEY", "ROVIE_CODE_API_KEY"],
        },
      })
    })

    yield* ctx.provider.transform((providers) => {
      const baseURL = (process.env.ROVIE_BASE_URL || defaultBaseURL).replace(/\/+$/, "")
      const models: Model.Info[] = CURATED_ROVIE_MODELS.map((entry) => {
        const slashIndex = entry.modelsDevId.indexOf("/")
        const upstreamProviderID = Provider.ID.make(
          slashIndex === -1 ? entry.provider : entry.modelsDevId.slice(0, slashIndex),
        )
        const upstreamModelID = Model.ID.make(
          slashIndex === -1 ? entry.modelsDevId : entry.modelsDevId.slice(slashIndex + 1),
        )
        const upstream = providers.get(upstreamProviderID)?.models.get(upstreamModelID)
        const id = Model.ID.make(entry.litellmModelName)

        return {
          id,
          modelID: id,
          providerID,
          type: "chat",
          name: upstream?.name ?? entry.displayName,
          family: upstream?.family,
          capabilities: upstream?.capabilities ?? Model.Capabilities.default(),
          variants: [],
          time: upstream?.time ?? { released: Date.now() },
          cost: upstream?.cost ?? [],
          status: "active",
          enabled: true,
          limit: upstream?.limit ?? { context: 200_000, output: 32_000 },
        } satisfies Model.Info
      })

      providers.add({
        info: {
          id: providerID,
          integrationID,
          name: "Rovie Route",
          activation: "enabled",
          package: "@opencode/ai/providers/openai-compatible",
          settings: {
            baseURL,
            provider: providerID,
          },
          headers: {
            "x-litellm-tags": "rovie-code",
          },
        },
        models,
      })
    })

    yield* ctx.model.transform((models) => {
      const rovieModels = models.list(providerID)
      if (rovieModels.length === 0) return
      if (!models.default.get()) {
        models.default.set(providerID, Model.ID.make("claude-sonnet-5-5"))
      }
    })

    yield* ctx.session.hook(
      "model.request",
      (event) =>
        Effect.sync(() => {
          event.headers["x-litellm-tags"] = "rovie-code"
          event.headers["x-litellm-session-id"] = event.sessionID
        }),
      { providerID },
    )

    const resolveApiKey = Effect.gen(function* () {
      const active = yield* ctx.integration.connection.active(integrationID)
      if (active) {
        const credential = yield* ctx.integration.connection.resolve(active)
        if (credential?.type === "key" && !isPlaceholderKey(credential.key)) return credential.key
        if (credential?.type === "oauth") return credential.access
      }
      const envKey = process.env.ROVIE_API_KEY?.trim() || process.env.ROVIE_CODE_API_KEY?.trim()
      return envKey && !isPlaceholderKey(envKey) ? envKey : undefined
    }).pipe(Effect.catch(() => Effect.succeed(undefined)))

    yield* ctx.rpc
      .register(RovieWalletRpc, {
        balance: () =>
          Effect.gen(function* () {
            const apiKey = yield* resolveApiKey
            if (!apiKey) return null
            const portalURL = (process.env.ROVIE_PORTAL_URL || defaultPortalURL).replace(/\/+$/, "")
            const request = HttpClientRequest.get(`${portalURL}/key/balance`).pipe(
              HttpClientRequest.acceptJson,
              HttpClientRequest.bearerToken(apiKey),
            )
            const result = yield* HttpClient.withScope(HttpClient.filterStatusOk(http))
              .execute(request)
              .pipe(
                Effect.flatMap(HttpClientResponse.schemaBodyJson(RovieWalletBalance)),
                Effect.scoped,
                Effect.timeout(Duration.seconds(8)),
                Effect.option,
              )
            return Option.getOrNull(result)
          }).pipe(Effect.catch(() => Effect.succeed(null))),
      })
      .pipe(Effect.orDie)
  }),
})
