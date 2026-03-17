import { Client, Environment } from 'square'

// Lazy initialization — Square client is only constructed when first accessed,
// not at module load time. This prevents build failures when env vars are absent.
let _client: Client | undefined

export function getSquareClient(): Client {
  if (!_client) {
    _client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN!,
      environment:
        process.env.SQUARE_ENVIRONMENT === 'production'
          ? Environment.Production
          : Environment.Sandbox,
    })
  }
  return _client
}
