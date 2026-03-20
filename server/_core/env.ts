export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  contaAzulClientId: process.env.CONTA_AZUL_CLIENT_ID ?? "",
  contaAzulClientSecret: process.env.CONTA_AZUL_CLIENT_SECRET ?? "",
  contaAzulRedirectUri: process.env.CONTA_AZUL_REDIRECT_URI ?? "http://localhost:3000/api/integrations/conta-azul/callback",
};
