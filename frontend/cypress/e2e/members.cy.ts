describe('Members Management E2E', () => {
  const timestamp = Date.now();
  const adminEmail = `admin_members_${timestamp}@gym.com`;
  const password = 'SecurePass123!';
  const gymName = 'Members Test Gym';
  
  const testMember = {
    name: `Test Member ${timestamp}`,
    start: '2026-01-01',
    end: '2026-12-31'
  };

  before(() => {
    // Create admin account
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

  describe('Add Member Flow', () => {
    it('navigates to add member page', () => {
      cy.contains('Add Member').click();
      cy.url().should('include', '/dashboard/add-member');
      cy.contains('Add New Member').should('exist');
    });

    it('displays add member form correctly', () => {
      cy.visit('/dashboard/add-member');
      
      cy.contains('Full Name').should('exist');
      cy.contains('Start Date').should('exist');
      cy.contains('End Date').should('exist');
      cy.contains('Add Member').should('exist');
    });

    it('validates required fields', () => {
      cy.visit('/dashboard/add-member');
      
      cy.contains('button', 'Add Member').click();
      
      // HTML5 validation should prevent submission
      cy.get('input[type=text]:invalid').should('exist');
    });

    it('creates a new member successfully', () => {
      cy.visit('/dashboard/add-member');
      
      cy.get('input[type=text]').type(testMember.name);
      cy.get('input[type=date]').first().type(testMember.start);
      cy.get('input[type=date]').last().type(testMember.end);
      
      cy.contains('button', 'Add Member').click();
      
      // Should show success message
      cy.contains('✅', { timeout: 5000 }).should('exist');
      cy.contains('successfully').should('exist');
      
      // Should redirect to dashboard
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      cy.url().should('not.include', '/add-member');
    });

    it('shows loading state during submission', () => {
      cy.visit('/dashboard/add-member');
      
      cy.get('input[type=text]').type('Loading Test Member');
      cy.get('input[type=date]').first().type('2026-01-01');
      cy.get('input[type=date]').last().type('2026-12-31');
      
      // Intercept to add delay
      cy.intercept('POST', '**/api/members', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      });
      
      cy.contains('button', 'Add Member').click();
      cy.contains('Adding Member...').should('exist');
      cy.get('button').should('be.disabled');
    });

    it('has back button that works', () => {
      cy.visit('/dashboard/add-member');
      cy.contains('Back').click();
      cy.url().should('include', '/dashboard');
      cy.url().should('not.include', '/add-member');
    });

    it('displays status indicator', () => {
      cy.visit('/dashboard/add-member');
      cy.contains('Status: ACTIVE').should('exist');
      cy.contains('Automatically linked to your gym').should('exist');
    });
  });

  describe('Edit Member Flow', () => {
    let memberId: string;

    before(() => {
      // Create a member to edit
      cy.clearLocalStorage();
      cy.visit('/login');
      cy.get('input[name=email]').type(adminEmail);
      cy.get('input[name=password]').type(password);
      cy.get('button[type=submit]').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      
      cy.visit('/dashboard/add-member');
      cy.get('input[type=text]').type('Edit Test Member');
      cy.get('input[type=date]').first().type('2026-01-01');
      cy.get('input[type=date]').last().type('2026-06-30');
      cy.contains('button', 'Add Member').click();
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
    });

    it('loads edit page with member data', () => {
      // This test assumes you can navigate to edit page
      // You'll need to get the member ID first from your members list
      // For now, we'll test the UI exists
      cy.log('Edit member page test - requires member ID from members list');
    });

    it('updates member information successfully', () => {
      cy.log('Edit member update test - requires implementation');
    });

    it('shows validation errors', () => {
      cy.log('Edit member validation test - requires implementation');
    });
  });

  describe('Members List (if exists)', () => {
    it('navigates to members list', () => {
      cy.contains('Manage Members').click();
      cy.url().should('include', '/dashboard/members');
    });

    it('displays created members', () => {
      cy.visit('/dashboard/members');
      // Check if members are displayed (this depends on your members list UI)
      cy.log('Members list test - requires members list page implementation');
    });
  });

  describe('Form UI & UX', () => {
    beforeEach(() => {
      cy.visit('/dashboard/add-member');
    });

    it('displays form with proper styling', () => {
      cy.get('.bg-white').should('exist');
      cy.get('.rounded-3xl').should('exist');
    });

    it('shows icons in form', () => {
      cy.contains('👤').should('exist');
      cy.contains('📅').should('exist');
    });

    it('has accessible form labels', () => {
      cy.get('label').should('have.length.at.least', 3);
    });

    it('displays gradient background', () => {
      cy.get('.bg-gradient-to-br').should('exist');
    });
  });
});
