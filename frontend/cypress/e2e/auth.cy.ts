describe('Authentication E2E', () => {
  const timestamp = Date.now();
  const adminEmail = `admin_${timestamp}@gym.com`;
  const staffEmail = `staff_${timestamp}@gym.com`;
  const password = 'SecurePass123!';
  const gymName = 'Test Gym E2E';

  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
  });

  describe('Signup Flow', () => {
    it('creates a gym owner account successfully', () => {
      cy.visit('/signup');
      
      // Fill form
      cy.get('input[name=gymName]').type(gymName);
      cy.get('input[name=email]').type(adminEmail);
      cy.get('input[name=password]').type(password);
      cy.get('input[name=role][value=admin]').check();
      cy.get('button[type=submit]').click();

      // Verify redirect to dashboard
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      cy.contains('Welcome back').should('exist');

      // Verify localStorage
      cy.window().then((win) => {
        const token = win.localStorage.getItem('token');
        const user = JSON.parse(win.localStorage.getItem('user') || '{}');
        expect(token).to.exist;
        expect(user.email).to.equal(adminEmail);
        expect(user.role).to.equal('admin');
      });
    });

    it('creates a staff account successfully', () => {
      cy.visit('/signup');
      
      cy.get('input[name=gymName]').type(gymName);
      cy.get('input[name=email]').type(staffEmail);
      cy.get('input[name=password]').type(password);
      cy.get('input[name=role][value=staff]').check();
      cy.get('button[type=submit]').click();

      // Staff should redirect to verify page
      cy.url({ timeout: 10000 }).should('include', '/verify');
      cy.contains('QR Verification').should('exist');
      cy.contains('Ready to scan QR').should('exist');
    });

    it('shows error for duplicate email', () => {
      cy.visit('/signup');
      
      cy.get('input[name=gymName]').type(gymName);
      cy.get('input[name=email]').type(adminEmail); // Use existing email
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();

      // Should show error message
      cy.contains('email already exists', { matchCase: false }).should('exist');
    });

    it('validates required fields', () => {
      cy.visit('/signup');
      
      // Try to submit empty form
      cy.get('button[type=submit]').click();

      // HTML5 validation should prevent submission
      cy.get('input[name=gymName]:invalid').should('exist');
    });

    it('toggles password visibility', () => {
      cy.visit('/signup');
      
      cy.get('input[name=password]').should('have.attr', 'type', 'password');
      
      // Click toggle button
      cy.get('input[name=password]').parent().find('button').click();
      cy.get('input[name=password]').should('have.attr', 'type', 'text');
      
      // Click again to hide
      cy.get('input[name=password]').parent().find('button').click();
      cy.get('input[name=password]').should('have.attr', 'type', 'password');
    });
  });

  describe('Login Flow', () => {
    it('logs in admin successfully', () => {
      cy.visit('/login');
      
      cy.get('input[name=email]').type(adminEmail);
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();

      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      cy.contains('Welcome back').should('exist');
    });

    it('logs in staff and redirects to verify page', () => {
      cy.visit('/login');
      
      cy.get('input[name=email]').type(staffEmail);
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();

      cy.url({ timeout: 10000 }).should('include', '/verify');
      cy.contains('QR Verification').should('exist');
    });

    it('shows error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('input[name=email]').type('wrong@email.com');
      cy.get('input[name=password]').type('wrongpassword');
      cy.get('button[type=submit]').click();

      // Check for any error message in the error alert div
      cy.get('.bg-red-50').should('exist').and('be.visible');
      // Or check for common error patterns
      cy.contains(/invalid|incorrect|failed|not found/i).should('exist');
    });

    it('shows error for wrong password', () => {
      cy.visit('/login');
      
      cy.get('input[name=email]').type(adminEmail);
      cy.get('input[name=password]').type('WrongPassword123!');
      cy.get('button[type=submit]').click();

      cy.contains(/invalid|incorrect|wrong/i).should('exist');
    });

    it('displays loading state during login', () => {
      cy.visit('/login');
      
      cy.get('input[name=email]').type(adminEmail);
      cy.get('input[name=password]').type(password);
      
      // Intercept request to add delay
      cy.intercept('POST', '**/api/auth/login', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      });
      
      cy.get('button[type=submit]').click();
      cy.contains('Signing in...').should('exist');
      cy.get('button[type=submit]').should('be.disabled');
    });
  });

  describe('Protected Routes', () => {
    it('redirects unauthenticated user to login from dashboard', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });

    it('redirects unauthenticated user to login from verify', () => {
      cy.visit('/verify');
      cy.url().should('include', '/login');
    });

    it('allows authenticated admin to access dashboard', () => {
      // Login first
      cy.visit('/login');
      cy.get('input[name=email]').type(adminEmail);
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');

      // Try accessing dashboard again
      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome back').should('exist');
    });
  });

  describe('Logout Flow', () => {
    it('logs out successfully and clears session', () => {
      // Login first
      cy.visit('/login');
      cy.get('input[name=email]').type(adminEmail);
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');

      // Logout
      cy.get('[data-cy=logout-btn]').should('be.visible').click();
      cy.url({ timeout: 10000 }).should('include', '/login');

      // Verify localStorage is cleared
      cy.window().then((win) => {
        const token = win.localStorage.getItem('token');
        expect(token).to.be.null;
      });

      // Try accessing protected route
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });
  });

  describe('Navigation Links', () => {
    it('navigates from login to signup', () => {
      cy.visit('/login');
      cy.contains('Sign up').click();
      cy.url().should('include', '/signup');
    });

    it('navigates from signup to login', () => {
      cy.visit('/signup');
      cy.contains('Sign in').click();
      cy.url().should('include', '/login');
    });
  });

  describe('UI Elements', () => {
    it('displays correct page titles and icons', () => {
      cy.visit('/login');
      cy.contains('Welcome back').should('exist');
      cy.contains('Sign in to access your gym dashboard').should('exist');

      cy.visit('/signup');
      cy.contains('Create your gym account').should('exist');
      cy.contains('Start managing your gym memberships digitally').should('exist');
    });

    it('shows trust badges on auth pages', () => {
      cy.visit('/login');
      cy.contains('Secure login with encrypted authentication').should('exist');

      cy.visit('/signup');
      cy.contains('Secure & encrypted').should('exist');
    });
  });

  describe('Verify Page (Staff)', () => {
    it('shows verification interface for staff', () => {
      // Login as staff
      cy.visit('/login');
      cy.get('input[name=email]').type(staffEmail);
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();

      cy.url({ timeout: 10000 }).should('include', '/verify');
      cy.contains('QR Verification').should('exist');
      cy.contains('Ready to scan QR').should('exist');
      cy.contains('Scan the member\'s QR code').should('exist');
    });

    it('verifies backend ping on verify page', () => {
      cy.visit('/login');
      cy.get('input[name=email]').type(staffEmail);
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();

      cy.url({ timeout: 10000 }).should('include', '/verify');
      
      // Wait for ping to complete
      cy.contains('Ready to scan QR', { timeout: 5000 }).should('exist');
    });
  });
});
