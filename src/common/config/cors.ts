/** Builds the API origin allowlist, preserving existing clients and allowing the deployed app.
 * @returns Explicit allowed origins and credential support; arbitrary origins are not allowed.
 */
export function getCorsOptions(configuredOrigins?: string): { origin: string[]; credentials: boolean } {
  return {
    origin: [
      'https://temusobat.tech',
      'https://cms.temusobat.tech',
      ...(configuredOrigins || 'http://localhost:8081,http://127.0.0.1:8081')
        .split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean),
      'http://localhost:5172',
      'http://localhost:5173',
      'https://mimate-cms.otesuto.com',
      'https://mimate.mymitsubishiapps.com',
    ],
    credentials: true,
  };
}
