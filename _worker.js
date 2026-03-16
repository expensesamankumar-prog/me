/**
 * OAuth Token Exchange Worker
 * Handles the Google OAuth token exchange for client-side login
 * Adds Admin Dashboard for monitoring visitor logs and site statistics
 */

const getEnv = (request, env) => {
    const url = new URL(request.url);
    return {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI || `${url.origin}/auth/callback`
    };
};

// Helper to get User Profile
async function getUserProfile(env, userId) {
    if (!env.DB) return null;
    const user = await env.DB.prepare("SELECT * FROM visitors WHERE id = ?").bind(userId).first();
    const prefs = await env.DB.prepare("SELECT * FROM user_preferences WHERE user_id = ?").bind(userId).first();
    return { ...user, preferences: prefs || { theme_color: 'gold' } };
}

// Admin Authentication Helper
function verifyAdmin(request, env) {
    const adminSecret = env.ADMIN_SECRET_TOKEN || env.ADMIN_SECRET || "admin123";
    const authHeader = request.headers.get("Authorization");
    const cookieToken = request.headers.get("Cookie")?.match(/admin_token=([^;]+)/)?.[1];
    
    // Check both Authorization header (Bearer or plain) and cookie
    return authHeader === `Bearer ${adminSecret}` || authHeader === adminSecret || cookieToken === adminSecret;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // --- AUTH MIDDLEWARE ---
        const isAdminRoute = url.pathname.startsWith("/admin") || 
                             ["/api/stats", "/api/visitors", "/api/messages", "/api/settings"].includes(url.pathname);
        
        if (isAdminRoute && !verifyAdmin(request, env)) {
            // If it's a browser navigation to /admin, show an error message
            if (url.pathname === "/admin") {
                return new Response("Unauthorized. Please provide valid ADMIN_SECRET_TOKEN.", { status: 401 });
            }
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        // --- 0. USER API ---
        if (url.pathname === "/api/user") {
            const userId = url.searchParams.get("id");
            if (!userId) {
                return new Response(JSON.stringify({ error: "User ID required" }), { status: 400 });
            }
            const profile = await getUserProfile(env, userId);
            
            // Basic Session Validation if it's not a generic look-up
            const hasSession = request.headers.get("Cookie")?.includes("access_token=");
            if (!hasSession && !verifyAdmin(request, env)) {
                // Return minimal info if no session/not admin
                return new Response(JSON.stringify({ name: profile?.name || "User", error: "Unauthorized session" }), { status: 401 });
            }

            return new Response(JSON.stringify(profile || { error: "Not found" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // --- 1. ADMIN PROTECTED DATA APIs ---
        if (["/api/stats", "/api/messages", "/api/visitors"].includes(url.pathname)) {
            if (!verifyAdmin(request, env)) {
                return new Response("Unauthorized", { status: 401 });
            }
            try {
                if (!env.DB) return new Response("DB Not Found", { status: 500 });
                
                let query, results;
                if (url.pathname === "/api/stats") {
                    const stats = await env.DB.prepare("SELECT * FROM site_stats WHERE id = 1").first();
                    return new Response(JSON.stringify(stats || { total_visits: 0 }), {
                        headers: { "Content-Type": "application/json" }
                    });
                } else if (url.pathname === "/api/messages") {
                    query = "SELECT * FROM contact_messages ORDER BY created_at DESC";
                } else { // /api/visitors
                    query = "SELECT * FROM visitors ORDER BY last_login DESC LIMIT 100";
                }
                    
                const data = await env.DB.prepare(query).all();
                return new Response(JSON.stringify(data.results), { 
                    headers: { "Content-Type": "application/json" } 
                });
            } catch (err) {
                return new Response(err.message, { status: 500 });
            }
        }

        // --- 2. CONTACT SYSTEM API ---
        if (url.pathname === "/api/contact" && request.method === "POST") {
            try {
                if (!env.DB) return new Response("DB Not Found", { status: 500 });
                const body = await request.json();
                const { name, email, message } = body;
                
                if (!name || !email || !message) {
                    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
                }

                await env.DB.prepare(
                    "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)"
                ).bind(name, email, message).run();

                return new Response(JSON.stringify({ success: true, message: "Message sent!" }), {
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                return new Response(err.message, { status: 500 });
            }
        }

        if (url.pathname === "/api/settings" && request.method === "POST") {
            try {
                if (!env.DB) return new Response("DB Not Found", { status: 500 });
                const body = await request.json();
                const { key, value, user_id } = body;

                if (!key || !value) {
                    return new Response(JSON.stringify({ error: "Missing key/value" }), { status: 400 });
                }

                if (user_id && key.startsWith("user_theme_")) {
                    // Update User Preference specifically
                    await env.DB.prepare(
                        "INSERT INTO user_preferences (user_id, theme_color) VALUES (?, ?) " +
                        "ON CONFLICT(user_id) DO UPDATE SET theme_color = excluded.theme_color, last_updated = CURRENT_TIMESTAMP"
                    ).bind(user_id, value).run();
                } else {
                    // Global settings (Admin only)
                    if (!verifyAdmin(request, env)) return new Response("Unauthorized", { status: 401 });
                    
                    await env.DB.prepare(
                        "INSERT INTO global_settings (key, value) VALUES (?, ?) " +
                        "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
                    ).bind(key, value).run();
                }

                // Also update last_update in site_stats
                await env.DB.prepare("UPDATE site_stats SET last_update = CURRENT_TIMESTAMP WHERE id = 1").run();

                return new Response(JSON.stringify({ success: true }), {
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                return new Response(err.message, { status: 500 });
            }
        }

        if (url.pathname === "/api/settings/theme") {
            try {
                if (!env.DB) return new Response("DB Not Found", { status: 500 });
                const theme = await env.DB.prepare("SELECT value FROM global_settings WHERE key = 'theme'").first("value");
                return new Response(JSON.stringify({ theme: theme || 'gold' }), {
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                return new Response(err.message, { status: 500 });
            }
        }

        // --- 3. ADMIN DASHBOARD HTML (Legacy/Internal) ---
        if (url.pathname === "/admin") {
            try {
                if (!env.DB) {
                    return new Response("Database binding not found", { status: 500 });
                }

                // Fetch data for the dashboard
                const { results: visitors } = await env.DB.prepare(
                    "SELECT * FROM visitors ORDER BY last_login DESC LIMIT 50"
                ).all();
                
                const stats = await env.DB.prepare(
                    "SELECT * FROM site_stats WHERE id = 1"
                ).first();

                return new Response(generateAdminHTML(visitors, stats || { total_visits: 0 }), {
                    headers: { "Content-Type": "text/html" },
                });
            } catch (err) {
                return new Response("Database Error: " + err.message, { status: 500 });
            }
        }

        // --- 2. OAUTH CALLBACK ---
        if (url.pathname === '/auth/callback') {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
                return Response.redirect(`${url.origin}/?auth_error=${encodeURIComponent(error)}`, 302);
            }

            if (code) {
                try {
                    const { clientId, clientSecret, redirectUri } = getEnv(request, env);

                    // Exchange code for tokens
                    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            code,
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
                            headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                        });
                        const userInfo = await userInfoResponse.json();

                        // ATOMIC BATCH UPDATE: Logging and Stats in one go
                        if (env.DB && userInfo.email) {
                            try {
                                await env.DB.batch([
                                    env.DB.prepare(
                                        "INSERT INTO visitors (id, email, name, last_login) VALUES (?, ?, ?, CURRENT_TIMESTAMP) " +
                                        "ON CONFLICT(id) DO UPDATE SET last_login = CURRENT_TIMESTAMP, name = excluded.name"
                                    ).bind(userInfo.id || userInfo.sub, userInfo.email, userInfo.name),
                                    env.DB.prepare(
                                        "UPDATE site_stats SET total_visits = total_visits + 1, last_update = CURRENT_TIMESTAMP WHERE id = 1"
                                    )
                                ]);
                            } catch (dbErr) {
                                console.error('Database logging error:', dbErr);
                            }
                        }

                        const userProfile = await getUserProfile(env, userInfo.id || userInfo.sub);

                        // Return HTML to sync localStorage and redirect
                        return new Response(`
                            <!DOCTYPE html>
                            <html>
                            <head><title>Logging you in...</title></head>
                            <body style="background: #030305; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                                <div style="text-align: center;">
                                    <div style="width: 40px; height: 40px; border: 3px solid #fbbf24; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                                    <p>Logging you in, ${userInfo.name}...</p>
                                </div>
                                <script>
                                    localStorage.setItem('user_id', '${userInfo.id || userInfo.sub}');
                                    localStorage.setItem('user_name', '${userInfo.name}');
                                    localStorage.setItem('user_email', '${userInfo.email}');
                                    localStorage.setItem('user_picture', '${userInfo.picture || ''}');
                                    localStorage.setItem('user_theme', '${userProfile.preferences.theme_color}');
                                    localStorage.setItem('is_logged_in', 'true');
                                    
                                    // Final redirect to User Dashboard
                                    window.location.href = '/user.html';
                                </script>
                                <style>
                                    @keyframes spin { to { transform: rotate(360deg); } }
                                </style>
                            </body>
                            </html>
                        `, { 
                            headers: { 
                                'Content-Type': 'text/html',
                                'Set-Cookie': `access_token=${tokens.access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${tokens.expires_in},refresh_token=${tokens.refresh_token || ''}; HttpOnly; Secure; SameSite=Lax; Path=/`
                            } 
                        });
                    } else {
                        return new Response(JSON.stringify({ error: "token_exchange_failed" }), { status: 400 });
                    }
                } catch (err) {
                    console.error('OAuth error:', err);
                    return new Response(JSON.stringify({ error: "unknown_error", message: err.message }), { status: 500 });
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

// --- 3. PREMIUM DASHBOARD UI (Tailwind + Dark Mode) ---
function generateAdminHTML(visitors, stats) {
    const rows = visitors.map(v => `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50 transition">
            <td class="p-4 text-gray-300 font-medium">${v.name || 'Anonymous'}</td>
            <td class="p-4 text-gray-400 text-sm">${v.email}</td>
            <td class="p-4 text-gray-500 text-xs">${new Date(v.last_login).toLocaleString()}</td>
        </tr>
    `).join("");

    return `
    <!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard | Aman Kumar</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; }
            .glass-card {
                background: rgba(17, 24, 39, 0.7);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.05);
            }
        </style>
    </head>
    <body class="bg-[#0b0e14] text-gray-100 min-h-screen p-6 md:p-12">
        <div class="max-w-5xl mx-auto animate-fade-in" style="animation: fadeIn 0.5s ease-out;">
            <header class="flex justify-between items-center mb-12">
                <div>
                    <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                        Visitor Log Book
                    </h1>
                    <p class="text-gray-500 mt-1">Real-time portfolio analytics</p>
                </div>
                <div class="glass-card p-4 rounded-2xl text-center min-w-[150px] shadow-lg shadow-yellow-500/5">
                    <span class="block text-xs text-gray-500 uppercase tracking-widest mb-1">Total Visits</span>
                    <span class="text-2xl font-mono text-yellow-500 font-bold">${stats.total_visits}</span>
                </div>
            </header>

            <main class="glass-card rounded-3xl overflow-hidden shadow-2xl">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th class="p-4 font-semibold">Name</th>
                                <th class="p-4 font-semibold">Email</th>
                                <th class="p-4 font-semibold">Logged At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
                ${visitors.length === 0 ? '<div class="p-12 text-center text-gray-600">No visitors logged yet.</div>' : ''}
            </main>
            
            <footer class="mt-8 text-center">
                <a href="/" class="text-sm text-gray-600 hover:text-yellow-500 transition-colors">← Back to Portfolio</a>
            </footer>
        </div>
        
        <style>
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    </body>
    </html>`;
}

