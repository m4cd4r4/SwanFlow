/**
 * SwanFlow Knowledge Base - Interactive JavaScript
 * Handles card expand/collapse, filtering, and theme toggle
 */

(function() {
  'use strict';

  // ============================================================================
  // THEME MANAGEMENT
  // ============================================================================

  function initTheme() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('swanflow-theme') || 'light';

    // Apply saved theme
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Theme toggle handler
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('swanflow-theme', newTheme);
      });
    }
  }

  // ============================================================================
  // CARD EXPAND/COLLAPSE
  // ============================================================================

  function initCardExpansion() {
    const cards = document.querySelectorAll('.knowledge-card');

    cards.forEach(card => {
      const header = card.querySelector('.card-header');
      const expandBtn = card.querySelector('.card-expand');

      // Click on header to expand/collapse
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking the expand button (it has its own handler)
        if (e.target.closest('.card-expand')) return;
        toggleCard(card);
      });

      // Expand button click
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleCard(card);
        });
      }
    });

    // Expand all cards by default on desktop
    if (window.innerWidth > 768) {
      cards.forEach(card => {
        card.classList.add('expanded');
      });
    }
  }

  function toggleCard(card) {
    const isExpanded = card.classList.contains('expanded');

    if (isExpanded) {
      card.classList.remove('expanded');
    } else {
      card.classList.add('expanded');
    }
  }

  // ============================================================================
  // QUICK NAVIGATION FILTERING
  // ============================================================================

  function initQuickNav() {
    const navBtns = document.querySelectorAll('.quick-nav-btn');
    const cards = document.querySelectorAll('.knowledge-card');

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active button
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Filter cards
        const target = btn.getAttribute('data-target');

        cards.forEach(card => {
          const category = card.getAttribute('data-category');

          if (target === 'all') {
            card.classList.remove('hidden');
            // Expand all visible cards on desktop
            if (window.innerWidth > 768) {
              card.classList.add('expanded');
            }
          } else if (category === target) {
            card.classList.remove('hidden');
            card.classList.add('expanded');
          } else {
            card.classList.add('hidden');
          }
        });

        // Smooth scroll to grid
        const grid = document.querySelector('.knowledge-grid');
        if (grid) {
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ============================================================================
  // SMOOTH SCROLL FOR NAVIGATION
  // ============================================================================

  function initSmoothScroll() {
    // Handle hash links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href').slice(1);
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      // Escape to collapse all cards
      if (e.key === 'Escape') {
        document.querySelectorAll('.knowledge-card.expanded').forEach(card => {
          card.classList.remove('expanded');
        });
      }

      // Space/Enter to toggle focused card
      if (e.key === ' ' || e.key === 'Enter') {
        const focused = document.activeElement;
        if (focused.closest('.card-header')) {
          e.preventDefault();
          const card = focused.closest('.knowledge-card');
          if (card) toggleCard(card);
        }
      }
    });

    // Make card headers focusable
    document.querySelectorAll('.card-header').forEach(header => {
      header.setAttribute('tabindex', '0');
      header.setAttribute('role', 'button');
      header.setAttribute('aria-expanded', 'false');
    });

    // Update aria-expanded when cards toggle
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const card = mutation.target;
          const header = card.querySelector('.card-header');
          if (header) {
            header.setAttribute('aria-expanded', card.classList.contains('expanded'));
          }
        }
      });
    });

    document.querySelectorAll('.knowledge-card').forEach(card => {
      observer.observe(card, { attributes: true });
    });
  }

  // ============================================================================
  // CODE BLOCK COPY FUNCTIONALITY
  // ============================================================================

  function initCodeCopy() {
    document.querySelectorAll('.code-block').forEach(block => {
      const code = block.querySelector('code');
      if (!code) return;

      // Create copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn';
      copyBtn.innerHTML = '📋';
      copyBtn.title = 'Copy to clipboard';
      copyBtn.style.cssText = `
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.25rem 0.5rem;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
      `;

      block.style.position = 'relative';
      block.appendChild(copyBtn);

      // Show on hover
      block.addEventListener('mouseenter', () => {
        copyBtn.style.opacity = '1';
      });
      block.addEventListener('mouseleave', () => {
        copyBtn.style.opacity = '0';
      });

      // Copy functionality
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent);
          copyBtn.innerHTML = '✓';
          setTimeout(() => {
            copyBtn.innerHTML = '📋';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
    });
  }

  // ============================================================================
  // INTERSECTION OBSERVER FOR ANIMATIONS
  // ============================================================================

  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.knowledge-card').forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(card);
    });
  }

  // ============================================================================
  // MOBILE TOUCH ENHANCEMENTS
  // ============================================================================

  function initTouchEnhancements() {
    if (!('ontouchstart' in window)) return;

    // Add touch feedback to cards
    document.querySelectorAll('.card-header').forEach(header => {
      header.addEventListener('touchstart', () => {
        header.style.opacity = '0.8';
      }, { passive: true });

      header.addEventListener('touchend', () => {
        header.style.opacity = '1';
      }, { passive: true });
    });

    // Add touch feedback to nav buttons
    document.querySelectorAll('.quick-nav-btn').forEach(btn => {
      btn.addEventListener('touchstart', () => {
        btn.style.transform = 'scale(0.95)';
      }, { passive: true });

      btn.addEventListener('touchend', () => {
        btn.style.transform = 'scale(1)';
      }, { passive: true });
    });
  }

  // ============================================================================
  // BACK TO TOP FUNCTIONALITY
  // ============================================================================

  function initBackToTop() {
    // Create back to top button
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.innerHTML = '↑';
    btn.title = 'Back to top';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(45, 139, 148, 0.3);
    `;

    document.body.appendChild(btn);

    // Show/hide based on scroll position
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        btn.style.opacity = '1';
        btn.style.visibility = 'visible';
      } else {
        btn.style.opacity = '0';
        btn.style.visibility = 'hidden';
      }
    }, { passive: true });

    // Scroll to top on click
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ============================================================================
  // PRINT STYLES
  // ============================================================================

  function initPrintHandler() {
    window.addEventListener('beforeprint', () => {
      // Expand all cards for printing
      document.querySelectorAll('.knowledge-card').forEach(card => {
        card.classList.add('expanded');
      });
    });
  }

  // ============================================================================
  // INITIALIZE ALL
  // ============================================================================

  function init() {
    initTheme();
    initCardExpansion();
    initQuickNav();
    initSmoothScroll();
    initKeyboardNav();
    initCodeCopy();
    initScrollAnimations();
    initTouchEnhancements();
    initBackToTop();
    initPrintHandler();

    console.log('SwanFlow Knowledge Base initialized');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
