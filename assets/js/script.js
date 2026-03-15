// OAuth Configuration
const oauthConfig = {
  clientId: '787702085630-tm6oq3ce94r97tnnl12fj0aah6neu89c.apps.googleusercontent.com',
  redirectUri: 'https://amankumar-9of.pages.dev/auth/callback',
  scopes: 'email profile openid',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token'
};

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('oauth_token') !== null;
}

// Get user info from Google
async function getUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
}

// Handle OAuth callback
async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth_success');
  const authError = urlParams.get('auth_error');
  const error = urlParams.get('error');

  if (authError || error) {
    console.error('OAuth Error:', authError || error);
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (authSuccess === 'true') {
    // Show success message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'oauth-message';
    messageDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:20px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:9999;font-family:sans-serif;';
    messageDiv.innerHTML = '<p style="margin:0;font-size:18px;">✅ Login successful!</p><p style="margin:10px 0 0;color:#666;">Setting up your session...</p>';
    document.body.appendChild(messageDiv);

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    setTimeout(() => {
      messageDiv.remove();
      // Reload to refresh the page state
      window.location.reload();
    }, 1500);
  }
}

// Google Login Function
function googleLogin() {
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem('oauth_state', state);

  const authUrl = `${oauthConfig.authUrl}?client_id=${oauthConfig.clientId}&redirect_uri=${encodeURIComponent(oauthConfig.redirectUri)}&response_type=code&scope=${encodeURIComponent(oauthConfig.scopes)}&state=${state}&access_type=offline`;

  window.location.href = authUrl;
}

// Logout Function
function googleLogout() {
  window.location.href = '/auth/logout';
}

// Check for OAuth callback on page load
document.addEventListener('DOMContentLoaded', function () {
  handleOAuthCallback();
});

// Favicon Animation
const favicon = document.getElementById('favicon');

const favicons = {
  ak: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>AK</text></svg>",
  loading1: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>●</text></svg>",
  loading2: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>AK</text></svg>",
};

let animationInterval;
let animationTimeout;

function startAnimation() {
  let state = 0;
  animationInterval = setInterval(() => {
    favicon.href = state % 2 === 0 ? favicons.loading1 : favicons.loading2;
    state++;
  }, 500);

  animationTimeout = setTimeout(() => {
    stopAnimation();
  }, 3000);
}

function stopAnimation() {
  clearInterval(animationInterval);
  clearTimeout(animationTimeout);
  favicon.href = favicons.ak;
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopAnimation();
  } else {
    startAnimation();
  }
}

// Set initial favicon
favicon.href = favicons.ak;

document.addEventListener('visibilitychange', handleVisibilityChange);

// Start animation on initial load
startAnimation();

// Admin Login Simulation Logic
function updateAdminLastLogin() {
  const adminLoginElement = document.getElementById('admin-last-login');
  if (!adminLoginElement) return;

  // Check if there's a stored login time
  let lastLogin = localStorage.getItem('admin-last-login');

  // If not, set a realistic initial value (e.g., 2 hours ago)
  if (!lastLogin) {
    const initialDate = new Date(Date.now() - 7200000); // 2 hours ago
    lastLogin = initialDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    localStorage.setItem('admin-last-login', lastLogin);
  }

  // Display the stored/initial login time
  adminLoginElement.textContent = lastLogin;

  // Simulate a new login for the NEXT time the page loads
  // This updates the value in background after showing the "current" last login
  const currentSessionLogin = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // We update it so that next time the user refreshes, they see the time of "this" session
  // But for a true "Last Admin Login", it should reflect the previous time.
  // So we only update it once per session if we want it to be sticky.
  if (!sessionStorage.getItem('admin-session-updated')) {
    localStorage.setItem('admin-last-login', currentSessionLogin);
    sessionStorage.setItem('admin-session-updated', 'true');
  }
}

// Update the login display when DOM is ready
document.addEventListener('DOMContentLoaded', updateAdminLastLogin);
// In case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  updateAdminLastLogin();
}
