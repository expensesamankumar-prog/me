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
