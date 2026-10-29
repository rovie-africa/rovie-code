const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://rovie.africa/code" : `https://${stage}.rovie.africa/code`,
  console: stage === "production" ? "https://route.rovie.africa" : `https://${stage}.route.rovie.africa`,
  email: "hello@rovie.africa",
  socialCard: "https://rovie.africa",
  github: "https://github.com/rovie-africa/rovie-code",
  discord: "https://discord.gg/rovie",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs" },
  ],
}
