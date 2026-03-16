// OAuth Configuration
const oauthConfig = {
  clientId: '787702085630-tm6oq3ce94r97tnnl12fj0aah6neu89c.apps.googleusercontent.com',
  redirectUri: window.location.origin + '/auth/callback', // Redirect to worker callback
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
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    console.error('OAuth Error:', error);
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  if (code) {
    try {
      // 1. Send code to Worker for exchange and DB log
      const response = await fetch(`/auth/callback?code=${code}`);

      if (response.ok) {
        // 2. Login successful, save user details
        const userData = await response.json();

        localStorage.setItem("user_name", userData.name || "User");
        localStorage.setItem("user_email", userData.email);
        localStorage.setItem("is_logged_in", "true");
        localStorage.setItem("user_picture", userData.picture || "");

        // 3. Clean URL and reload to apply changes
        window.location.href = "/";
      } else {
        console.error('Failed to exchange code');
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
    }
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

// Update UI based on auth status
function updateAuthUI() {
  const authNav = document.getElementById('auth-nav');
  const contactName = document.getElementById('contact-name');
  const contactEmail = document.getElementById('contact-email');

  const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';

  if (isLoggedIn) {
    const userName = localStorage.getItem('user_name') || 'User';
    const userEmail = localStorage.getItem('user_email') || '';
    const userPicture = localStorage.getItem('user_picture');

    // Auto-fill contact form
    if (contactName) contactName.value = userName;
    if (contactEmail) contactEmail.value = userEmail;

    if (authNav) {
      authNav.innerHTML = `
          <div class="flex items-center space-x-3">
            <a href="user.html" class="flex items-center space-x-2 group">
              ${userPicture ?
          `<img src="${userPicture}" class="w-8 h-8 rounded-full border border-accent/50 group-hover:scale-110 transition-transform" alt="User">` :
          `<div class="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">${userName[0]}</div>`
        }
              <span class="text-gray-300 text-sm font-medium group-hover:text-accent transition-colors">${userName}</span>
            </a>
            <button onclick="googleLogout()" class="text-xs text-gray-500 hover:text-red-400 transition-colors">Logout</button>
          </div>
        `;
    }
  } else if (authNav) {
    authNav.innerHTML = `<button onclick="googleLogin()" class="px-4 py-2 border border-accent/30 text-accent rounded-lg hover:bg-accent hover:text-primary transition-all font-medium text-sm">Login</button>`;
  }
}

// Contact Form Handler
async function handleContactForm(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = document.getElementById('contact-submit');
  if (!submitBtn) return;
  const originalText = submitBtn.textContent;

  const nameEl = document.getElementById('contact-name');
  const emailEl = document.getElementById('contact-email');
  const messageEl = document.getElementById('contact-message');

  if (!nameEl || !emailEl || !messageEl) return;

  const data = {
    name: nameEl.value,
    email: emailEl.value,
    message: messageEl.value
  };

  try {
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      alert('✅ Message sent successfully!');
      form.reset();
      updateAuthUI(); // Re-fill name/email if logged in
    } else {
      throw new Error('Failed to send message');
    }
  } catch (err) {
    console.error(err);
    alert('❌ Error sending message. Please try again.');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// GitHub Live Activity Banner
async function fetchGitHubActivity() {
  const username = 'expensesamankumar-prog';
  const contentEl = document.getElementById('activity-content');
  const timeEl = document.getElementById('activity-time');

  try {
    const response = await fetch(`https://api.github.com/users/${username}/events/public`);
    const events = await response.json();

    // 1. Sirf PushEvents (commits) dhundho
    const lastPush = events.find(e => e.type === 'PushEvent');

    if (lastPush) {
      const repoName = lastPush.repo.name.split('/')[1];
      const lastCommit = lastPush.payload.commits[0].message;
      const eventTime = new Date(lastPush.created_at);

      // 2. Display the data
      contentEl.innerHTML = `
                Working on <span class="repo-tag">${repoName}</span>: 
                <span class="commit-msg">"${lastCommit}"</span>
            `;

      // 3. Relative time logic (e.g., 5 mins ago)
      timeEl.innerText = formatRelativeTime(eventTime);
    } else {
      contentEl.innerText = "Exploring new technologies 🚀";
    }
  } catch (error) {
    contentEl.innerText = "Building amazing things on GitHub";
    console.error("GitHub API error:", error);
  }
}

// Chota function time format karne ke liye
function formatRelativeTime(date) {
  const diff = Math.floor((new Date() - date) / 1000 / 60);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

// Har 5 minute mein update karein
fetchGitHubActivity();
setInterval(fetchGitHubActivity, 300000);

// Smart Projects Loader
async function loadSmartProjects() {
  const username = 'expensesamankumar-prog';
  const projectContainer = document.getElementById('github-projects'); // Ensure this ID exists in HTML

  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`);
    const repos = await response.json();

    // 1. Smart Filtering Logic
    const bestProjects = repos
      .filter(repo => !repo.fork && repo.description !== null) // Sirf original projects aur jinme description ho
      .sort((a, b) => {
        // Score = Stars + Forks + (Recent Activity Weight)
        const scoreA = a.stargazers_count + a.forks_count;
        const scoreB = b.stargazers_count + b.forks_count;
        return scoreB - scoreA;
      })
      .slice(0, 8); // Top 8 projects uthao

    // 2. Clear Container and Render
    projectContainer.innerHTML = '';

    if (bestProjects.length === 0) {
      projectContainer.innerHTML = "<p>Bringing new innovations to life... 🚀</p>";
      return;
    }

    bestProjects.forEach(repo => {
      projectContainer.innerHTML += createProjectCard(repo);
    });

  } catch (error) {
    console.error("Error loading smart projects:", error);
  }
}

// Get Language Icon Function
function getLanguageIcon(lang) {
  if (!lang) return '';

  // Sabhi languages ko lowercase karke match karenge
  const iconMap = {
    'javascript': 'js',
    'typescript': 'ts',
    'python': 'python',
    'rust': 'rust',
    'go': 'go',
    'html': 'html5',
    'css': 'css3',
    'php': 'php',
    'shell': 'terminal'
  };

  const icon = iconMap[lang.toLowerCase()] || 'code';

  // Skill Icons API ka use karke direct SVG link return karega
  return `https://skillicons.dev/icons?i=${icon}`;
}

// Card Template Function
function createProjectCard(repo) {
  const iconUrl = getLanguageIcon(repo.language);

  return `
        <div class="project-card">
            <div class="card-header">
                <div class="tech-badge">
                    ${iconUrl ? `<img src="${iconUrl}" alt="${repo.language}" class="lang-icon">` : ''}
                    <span class="card-status">${repo.language || 'Code'}</span>
                </div>
                <div class="github-stats">
                    <span>⭐ ${repo.stargazers_count}</span>
                </div>
            </div>
            
            <h3>${repo.name}</h3>
            <p>${repo.description || 'No description available'}</p>
            
            <div class="card-footer">
                <a href="${repo.html_url}" target="_blank" class="repo-link">
                    <span>Source Code</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                </a>
            </div>
        </div>
    `;
}

// Initial Load
loadSmartProjects();

// GitHub Projects Fetcher
async function fetchGitHubProjects() {
  const username = 'expensesamankumar-prog';
  const container = document.getElementById('github-projects');
  if (!container) return;

  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`);
    if (!response.ok) throw new Error('GitHub API Unreachable');

    const repos = await response.json();

    container.innerHTML = ''; // Loading text hatao

    repos.forEach(repo => {
      if (!repo.fork && repo.name !== 'expensesamankumar-prog') {
        const card = `
                    <div class="project-card animate-fade-in">
                        <h3>${repo.name}</h3>
                        <p>${repo.description || 'Linux & Web Automation Project'}</p>
                        <div class="tags">
                            <span>${repo.language || 'JS'}</span>
                        </div>
                        <a href="${repo.html_url}" target="_blank">View Repo →</a>
                    </div>
                `;
        container.innerHTML += card;
      }
    });
  } catch (error) {
    console.error('Error fetching repos:', error);
    container.innerHTML = `
            <div class="col-span-full glass-card p-12 text-center rounded-2xl border-dashed border-white/10">
                <p class="text-gray-400 mb-4">Failed to load projects. Check console for details.</p>
                <a href="https://github.com/${username}" target="_blank" class="px-6 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-accent hover:text-primary transition-all font-bold text-sm">VIEW ON GITHUB</a>
            </div>
        `;
  }
}

// Live Activity Logic
function updateLiveActivity() {
  const timestamp = document.getElementById('activity-timestamp');
  if (timestamp) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    timestamp.textContent = `Last seen: ${timeStr}`;
  }
}

// Check for OAuth callback on page load
document.addEventListener('DOMContentLoaded', function () {
  handleOAuthCallback();
  updateAuthUI();
  fetchGitHubProjects();
  updateLiveActivity();

  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
  }
});

// Favicon Animation
document.addEventListener('DOMContentLoaded', () => {
  // 1. Favicon select karo (ya create karo agar nahi hai toh)
  let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');

  if (!favicon) {
    // Agar HTML mein tag nahi hai, toh ek naya tag create kar lo
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }

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
});

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
