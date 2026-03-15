/**
 * OAuth Token Exchange Worker
 * Handles the Google OAuth token exchange for client-side login
 */

// Use environment variables for OAuth configuration
// These must be set in the Cloudflare Pages dashboard
const getEnv = (env) => ({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI || 'https://amankumar-9of.pages.dev/auth/callback'
});

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle the OAuth token exchange
        if (url.pathname === '/auth/callback' || url.searchParams.has('code')) {
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            if (error) {
                return new Response(null, {
                    status: 302,
                    headers: {
                        'Location': `/?auth_error=${encodeURIComponent(error)}`
                    }
                });
            }

            if (code) {
                try {
                    const { clientId, clientSecret, redirectUri } = getEnv(env);

                    // Exchange code for tokens
                    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: new URLSearchParams({
                            code: code,
                            client_id: clientId,
                            client_secret: clientSecret,
                            redirect_uri: redirectUri,
                            grant_type: 'authorization_code'
                        })
                    });

                    const tokens = await tokenResponse.json();

                    if (tokens.access_token) {
                        // Get user info
                        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                            headers: {
                                'Authorization': `Bearer ${tokens.access_token}`
                            }
                        });
                        const userInfo = await userInfoResponse.json();

                        // Create a response with tokens in a secure cookie
                        const response = new Response(null, {
                            status: 302,
                            headers: {
                                'Location': '/?auth_success=true',
                                'Set-Cookie': `access_token=${tokens.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${tokens.expires_in},refresh_token=${tokens.refresh_token || ''}; HttpOnly; Secure; SameSite=Lax; Path=/`
                            }
                        });

                        // Also store user info in a separate cookie (non-sensitive data only)
                        response.headers.append('Set-Cookie', `user_email=${encodeURIComponent(userInfo.email || '')}; Path=/; Max-Age=${tokens.expires_in}`);

                        return response;
                    } else {
                        console.error('Token exchange failed:', tokens);
                        return new Response(null, {
                            status: 302,
                            headers: {
                                'Location': '/?auth_error=token_exchange_failed'
                            }
                        });
                    }
                } catch (err) {
                    console.error('OAuth error:', err);
                    return new Response(null, {
                        status: 302,
                        headers: {
                            'Location': '/?auth_error=unknown'
                        }
                    });
                }
            }
        }

        // Handle logout
        if (url.pathname === '/auth/logout') {
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': '/',
                    'Set-Cookie': 'access_token=; HttpOnly; Path=/; Max-Age=0,refresh_token=; HttpOnly; Path=/; Max-Age=0,user_email=; Path=/; Max-Age=0'
                }
            });
        }

        // Default: serve static assets from the Pages project
        return env.ASSETS.fetch(request);
    }
};
