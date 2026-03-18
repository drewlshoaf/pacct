'use client';

import type {
  ScenarioStep,
  AuthConfig,
  AuthType,
  ApiKeyLocation,
  OAuthGrantType,
} from '../../types';
import ToggleButtonGroup from '../ToggleButtonGroup';

const AUTH_TYPES: { value: AuthType; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No authentication' },
  { value: 'bearer', label: 'Bearer', description: 'Token-based auth' },
  { value: 'basic', label: 'Basic', description: 'Username & password' },
  { value: 'api_key', label: 'API Key', description: 'Key in header or query' },
  { value: 'oauth2', label: 'OAuth 2.0', description: 'Client credentials or password grant' },
];

const API_KEY_LOCATIONS: { value: ApiKeyLocation; label: string }[] = [
  { value: 'header', label: 'Header' },
  { value: 'query', label: 'Query Param' },
];

const OAUTH_GRANT_TYPES: { value: OAuthGrantType; label: string }[] = [
  { value: 'client_credentials', label: 'Client Credentials' },
  { value: 'password', label: 'Password' },
];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetAuth: (auth: AuthConfig) => void;
}

export default function AuthSubTab({ step, errors, onSetAuth }: Props) {
  const { auth } = step;
  const prefix = `step.${step.id}.auth`;

  const setType = (type: AuthType) => {
    const next: AuthConfig = { type };
    if (type === 'bearer') next.bearer = auth.bearer ?? { token: '' };
    if (type === 'basic') next.basic = auth.basic ?? { username: '', password: '' };
    if (type === 'api_key') next.api_key = auth.api_key ?? { key: '', value: '', location: 'header' };
    if (type === 'oauth2')
      next.oauth2 = auth.oauth2 ?? {
        token_url: '',
        client_id: '',
        client_secret: '',
        scope: '',
        grant_type: 'client_credentials',
      };
    onSetAuth(next);
  };

  const updateBearer = (token: string) => {
    onSetAuth({ ...auth, bearer: { token } });
  };

  const updateBasic = (field: 'username' | 'password', value: string) => {
    onSetAuth({
      ...auth,
      basic: { username: auth.basic?.username ?? '', password: auth.basic?.password ?? '', [field]: value },
    });
  };

  const updateApiKey = (field: 'key' | 'value' | 'location', value: string) => {
    onSetAuth({
      ...auth,
      api_key: {
        key: auth.api_key?.key ?? '',
        value: auth.api_key?.value ?? '',
        location: auth.api_key?.location ?? 'header',
        [field]: value,
      },
    });
  };

  const updateOAuth2 = (field: string, value: string) => {
    onSetAuth({
      ...auth,
      oauth2: {
        token_url: auth.oauth2?.token_url ?? '',
        client_id: auth.oauth2?.client_id ?? '',
        client_secret: auth.oauth2?.client_secret ?? '',
        scope: auth.oauth2?.scope ?? '',
        grant_type: auth.oauth2?.grant_type ?? 'client_credentials',
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Auth Type Selector */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Authentication Type
        </label>
        <ToggleButtonGroup
          options={AUTH_TYPES.map(t => ({ value: t.value, label: t.label, description: t.description }))}
          value={auth.type}
          onChange={(v) => setType(v as AuthType)}
          variant="card"
        />
      </div>

      {/* Bearer Token */}
      {auth.type === 'bearer' && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
            Bearer Token
          </label>
          <input
            type="text"
            value={auth.bearer?.token ?? ''}
            onChange={e => updateBearer(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIs... or {{token_var}}"
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
            The token will be sent as <code className="font-mono text-[10px]" style={{ color: 'var(--rm-text-secondary)' }}>Authorization: Bearer &lt;token&gt;</code>. Supports variable interpolation.
          </p>
          {errors[`${prefix}.bearer.token`] && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.bearer.token`]}</p>
          )}
        </div>
      )}

      {/* Basic Auth */}
      {auth.type === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Username
            </label>
            <input
              type="text"
              value={auth.basic?.username ?? ''}
              onChange={e => updateBasic('username', e.target.value)}
              placeholder="admin or {{username_var}}"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${prefix}.basic.username`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.basic.username`]}</p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              value={auth.basic?.password ?? ''}
              onChange={e => updateBasic('password', e.target.value)}
              placeholder="••••••••"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              Credentials are Base64-encoded in the Authorization header.
            </p>
            {errors[`${prefix}.basic.password`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.basic.password`]}</p>
            )}
          </div>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'api_key' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Key Name
            </label>
            <input
              type="text"
              value={auth.api_key?.key ?? ''}
              onChange={e => updateApiKey('key', e.target.value)}
              placeholder="X-API-Key"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${prefix}.api_key.key`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.api_key.key`]}</p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Key Value
            </label>
            <input
              type="text"
              value={auth.api_key?.value ?? ''}
              onChange={e => updateApiKey('value', e.target.value)}
              placeholder="sk_live_... or {{api_key_var}}"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${prefix}.api_key.value`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.api_key.value`]}</p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Send In
            </label>
            <ToggleButtonGroup
              options={API_KEY_LOCATIONS}
              value={auth.api_key?.location ?? 'header'}
              onChange={(v) => updateApiKey('location', v)}
              size="sm"
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              Send the API key as a request header or as a query parameter.
            </p>
          </div>
        </div>
      )}

      {/* OAuth 2.0 */}
      {auth.type === 'oauth2' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Grant Type
            </label>
            <ToggleButtonGroup
              options={OAUTH_GRANT_TYPES}
              value={auth.oauth2?.grant_type ?? 'client_credentials'}
              onChange={(v) => updateOAuth2('grant_type', v)}
              size="sm"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Token URL
            </label>
            <input
              type="text"
              value={auth.oauth2?.token_url ?? ''}
              onChange={e => updateOAuth2('token_url', e.target.value)}
              placeholder="https://auth.example.com/oauth/token"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${prefix}.oauth2.token_url`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.oauth2.token_url`]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Client ID
              </label>
              <input
                type="text"
                value={auth.oauth2?.client_id ?? ''}
                onChange={e => updateOAuth2('client_id', e.target.value)}
                placeholder="client_id"
                className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              {errors[`${prefix}.oauth2.client_id`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.oauth2.client_id`]}</p>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Client Secret
              </label>
              <input
                type="password"
                value={auth.oauth2?.client_secret ?? ''}
                onChange={e => updateOAuth2('client_secret', e.target.value)}
                placeholder="••••••••"
                className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              {errors[`${prefix}.oauth2.client_secret`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.oauth2.client_secret`]}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Scope
            </label>
            <input
              type="text"
              value={auth.oauth2?.scope ?? ''}
              onChange={e => updateOAuth2('scope', e.target.value)}
              placeholder="read write profile"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              Space-separated list of OAuth scopes to request.
            </p>
          </div>
        </div>
      )}

      {/* None message */}
      {auth.type === 'none' && (
        <p className="text-[12px] py-2" style={{ color: 'var(--rm-text-muted)' }}>
          This step will not include any authentication headers.
        </p>
      )}
    </div>
  );
}
