/**
 * Token plumbing between the auth feature and shared transport. The auth
 * feature registers a provider backed by SecureStore; interceptors and the
 * standalone adapter read the token through it, so UI modules never see secrets.
 */
type TokenProvider = () => Promise<string | null>;
type UnauthorizedHandler = () => void;

let tokenProvider: TokenProvider = async () => null;
let unauthorizedHandler: UnauthorizedHandler = () => undefined;

export function registerTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export function getAuthToken(): Promise<string | null> {
  return tokenProvider();
}

export function notifyUnauthorized(): void {
  unauthorizedHandler();
}
