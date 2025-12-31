describe('Authentication E2E', () => {
  const email = `test_${Date.now()}@gym.com`;
  const password = 'SecurePass123!';
  const gymName = 'Test Gym';

  it('redirects unauthenticated user to login', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('signs up a new user and logs out correctly', () => {
    // Sign up
    cy.visit('/signup');
    cy.get('input[name=gymName]').type(gymName);
    cy.get('input[name=email]').type(email);
    cy.get('input[name=password]').type(password);
    cy.get('button[type=submit]').click();

    // Ensure dashboard is loaded
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.contains('Welcome back').should('exist');

    // Logout
    cy.get('[data-cy=logout-btn]').should('be.visible').click();
    cy.url({ timeout: 10000 }).should('include', '/login');
  });

  it('logs in successfully', () => {
    cy.visit('/login');
    cy.get('input[name=email]').type(email);
    cy.get('input[name=password]').type(password);
    cy.get('button[type=submit]').click();

    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.contains('Welcome back').should('exist');
  });
});
