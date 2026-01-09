describe('Dashboard E2E', () => {
  const timestamp = Date.now();
  const adminEmail = `admin_dash_${timestamp}@gym.com`;
  const password = 'SecurePass123!';
  const gymName = 'Dashboard Test Gym';

  before(() => {
    // Create admin account once before all tests
    cy.visit('/signup');
    cy.get('input[name=gymName]').type(gymName);
    cy.get('input[name=email]').type(adminEmail);
    cy.get('input[name=password]').type(password);
    cy.get('input[name=role][value=admin]').check();
    cy.get('button[type=submit]').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
  });

  beforeEach(() => {
    // Login before each test
    cy.clearLocalStorage();
    cy.visit('/login');
    cy.get('input[name=email]').type(adminEmail);
    cy.get('input[name=password]').type(password);
    cy.get('button[type=submit]').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
  });

  describe('Dashboard Layout & UI', () => {
    it('displays dashboard header with gym info', () => {
      cy.contains(gymName).should('exist');
      cy.contains('Gym Management Dashboard').should('exist');
      cy.get('[data-cy=logout-btn]').should('be.visible');
    });

    it('shows welcome message with user info', () => {
      cy.contains('Welcome back').should('exist');
      cy.contains('admin').should('exist');
    });

    it('displays stats cards with correct titles', () => {
      cy.contains('Total Members').should('exist');
      cy.contains('Active Members').should('exist');
      cy.contains('Today\'s Check-ins').should('exist');
    });

    it('shows gym logo or placeholder', () => {
      // Check if logo or placeholder SVG exists
      cy.get('header').within(() => {
        cy.get('img, svg').should('exist');
      });
    });

    it('displays info note at bottom', () => {
      cy.contains('Dashboard is ready!').should('exist');
      cy.contains('This is your admin dashboard').should('exist');
    });
  });

  describe('Stats Display', () => {
    it('loads and displays stats without loading state', () => {
      // Wait for stats to load
      cy.wait(2000);
      
      // Check that loading skeleton is gone
      cy.get('.animate-pulse').should('not.exist');
      
      // Stats should be visible (even if 0)
      cy.contains('Total Members').parent().parent().within(() => {
        cy.get('.text-2xl').should('be.visible');
      });
    });

    it('shows numeric values for all stats', () => {
      cy.wait(2000);
      
      // Each stat card should have a number
      cy.contains('Total Members').parent().parent().find('.text-2xl').invoke('text').should('match', /^\d+$/);
      cy.contains('Active Members').parent().parent().find('.text-2xl').invoke('text').should('match', /^\d+$/);
      cy.contains('Today\'s Check-ins').parent().parent().find('.text-2xl').invoke('text').should('match', /^\d+$/);
    });

    it('displays loading state initially', () => {
      cy.reload();
      // Should see loading skeleton briefly
      cy.get('.animate-pulse', { timeout: 1000 }).should('exist');
    });
  });

  describe('Quick Actions', () => {
    it('displays all quick action buttons', () => {
      cy.contains('Quick Actions').should('exist');
      cy.contains('Add Member').should('exist');
      cy.contains('Scan QR Code').should('exist');
      cy.contains('Manage Members').should('exist');
      cy.contains('Gym Settings').should('exist');
    });

    it('navigates to add member page', () => {
      cy.contains('Add Member').click();
      cy.url().should('include', '/dashboard/add-member');
    });

    it('navigates to members list page', () => {
      cy.contains('Manage Members').click();
      cy.url().should('include', '/dashboard/members');
    });

    it('navigates to gym profile page', () => {
      cy.contains('Gym Settings').click();
      cy.url().should('include', '/dashboard/gym-profile');
    });

  });

  describe('Navigation & Logout', () => {
    it('logs out successfully from dashboard', () => {
      cy.get('[data-cy=logout-btn]').click();
      cy.url({ timeout: 5000 }).should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });

    it('persists user data in localStorage', () => {
      cy.window().then((win) => {
        const user = JSON.parse(win.localStorage.getItem('user') || '{}');
        expect(user.email).to.equal(adminEmail);
        expect(user.role).to.equal('admin');
      });
    });
  });

  describe('Responsive Design', () => {
    it('displays correctly on mobile viewport', () => {
      cy.viewport(375, 667); // iPhone SE
      cy.contains(gymName).should('be.visible');
      cy.get('[data-cy=logout-btn]').should('be.visible');
    });

    it('displays correctly on tablet viewport', () => {
      cy.viewport(768, 1024); // iPad
      cy.contains('Quick Actions').should('be.visible');
      cy.get('.grid').should('exist');
    });

    it('displays correctly on desktop viewport', () => {
      cy.viewport(1920, 1080);
      cy.contains('Gym Management Dashboard').should('be.visible');
    });
  });

  describe('Protected Route', () => {
    it('redirects to login when not authenticated', () => {
      cy.clearLocalStorage();
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('redirects staff to verify page', () => {
      cy.clearLocalStorage();
      
      // Create and login as staff
      const staffEmail = `staff_dash_${timestamp}@gym.com`;
      cy.visit('/signup');
      cy.get('input[name=gymName]').type('Staff Gym');
      cy.get('input[name=email]').type(staffEmail);
      cy.get('input[name=password]').type(password);
      cy.get('input[name=role][value=staff]').check();
      cy.get('button[type=submit]').click();
      
      // Should redirect to verify, not dashboard
      cy.url({ timeout: 10000 }).should('include', '/verify');
      
      // Try accessing dashboard directly
      cy.visit('/dashboard');
      cy.url().should('include', '/verify');
    });
  });
});
