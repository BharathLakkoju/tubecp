import crypto from "node:crypto";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { getRedis, readStoredValue } from "@/lib/store/redis";

const memoryClients = new Map<string, OAuthClientInformationFull>();

function clientKey(clientId: string): string {
  return `mcp-oauth-client:${clientId}`;
}

async function readClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(clientKey(clientId));
    return readStoredValue<OAuthClientInformationFull>(raw) ?? undefined;
  }

  return memoryClients.get(clientId);
}

async function writeClient(client: OAuthClientInformationFull): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(clientKey(client.client_id), client, {
      ex: 60 * 60 * 24 * 365,
    });
    return;
  }

  memoryClients.set(client.client_id, client);
}

export const mcpOAuthClientsStore: OAuthRegisteredClientsStore = {
  getClient(clientId: string) {
    return readClient(clientId);
  },

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ) {
    const registered: OAuthClientInformationFull = {
      ...client,
      client_id: crypto.randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    };

    await writeClient(registered);
    return registered;
  },
};
