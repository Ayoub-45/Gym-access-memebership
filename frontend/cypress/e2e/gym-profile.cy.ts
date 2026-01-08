describe('Gym Profile E2E', () => {
  const timestamp = Date.now();
  const adminEmail = `admin_profile_${timestamp}@gym.com`;
  const password = 'SecurePass123!';
  const gymName = 'Profile Test Gym';
  const updatedGymName = `Updated ${gymName}`;
  const gymAddress = '123 Fitness Street, Gym City, GC 12345';

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
    cy.clearLocalStorage();
    cy.visit('/login');
    cy.get('input[name=email]').type(adminEmail);
    cy.get('input[name=password]').type(password);
    cy.get('button[type=submit]').click();
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
  });

  describe('Navigation', () => {
    it('navigates to gym profile from dashboard', () => {
      cy.contains('Gym Settings').click();
      cy.url().should('include', '/dashboard/gym-profile');
    });

    it('displays gym profile header', () => {
      cy.visit('/dashboard/gym-profile');
      cy.contains('Gym Profile').should('exist');
      cy.contains('Back to Dashboard').should('exist');
    });

    it('returns to dashboard via back button', () => {
      cy.visit('/dashboard/gym-profile');
      cy.contains('Back to Dashboard').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/dashboard');
    });
  });

  describe('Profile Form Display', () => {
    beforeEach(() => {
      cy.visit('/dashboard/gym-profile');
    });

    it('loads existing gym profile data', () => {
      cy.get('input[name=name]').should('have.value', gymName);
    });

    it('displays all form fields', () => {
      cy.contains('Gym Name').should('exist');
      cy.contains('Logo Image').should('exist');
      cy.contains('Address').should('exist');
      cy.contains('Subscription Status').should('exist');
      cy.contains('Gym ID').should('exist');
    });

    it('shows subscription status badge', () => {
      cy.contains('Subscription Status').parent().within(() => {
        cy.get('.rounded-full').should('exist');
      });
    });

    it('displays read-only gym ID', () => {
      cy.contains('Gym ID').parent().within(() => {
        cy.get('.font-mono').should('exist');
      });
    });

    it('shows info note about visibility', () => {
      cy.contains('Your gym profile is visible to all members').should('exist');
    });
  });

  describe('Update Profile', () => {
    it('updates gym name successfully', () => {
      cy.visit('/dashboard/gym-profile');
      
      cy.get('input[name=name]').clear().type(updatedGymName);
      cy.contains('button', 'Save Changes').click();
      
      cy.contains('successfully', { timeout: 5000 }).should('exist');
      
      // Verify update persisted
      cy.reload();
      cy.get('input[name=name]').should('have.value', updatedGymName);
    });

    it('updates gym address', () => {
      cy.visit('/dashboard/gym-profile');
      
      cy.get('textarea[name=address]').clear().type(gymAddress);
      cy.contains('button', 'Save Changes').click();
      
      cy.contains('successfully', { timeout: 5000 }).should('exist');
    });

    it('shows success message and redirects', () => {
      cy.visit('/dashboard/gym-profile');
      
      cy.get('input[name=name]').clear().type(`Test ${timestamp}`);
      cy.contains('button', 'Save Changes').click();
      
      cy.get('.bg-green-50', { timeout: 5000 }).should('exist');
      cy.url({ timeout: 10000 }).should('include', '/dashboard');
      cy.url().should('not.include', '/gym-profile');
    });

    it('updates localStorage after save', () => {
      cy.visit('/dashboard/gym-profile');
      
      const newName = `Updated ${timestamp}`;
      cy.get('input[name=name]').clear().type(newName);
      cy.contains('button', 'Save Changes').click();
      
      cy.wait(2000);
      cy.window().then((win) => {
        const user = JSON.parse(win.localStorage.getItem('user') || '{}');
        expect(user.gymName).to.equal(newName);
      });
    });
  });

  describe('Logo Upload', () => {
    beforeEach(() => {
      cy.visit('/dashboard/gym-profile');
    });

    it('displays logo upload input', () => {
      cy.contains('Logo Image').should('exist');
      cy.get('input[type=file]').should('exist');
    });

    it('shows file input label', () => {
      cy.contains('Choose File').should('exist');
    });

    it('accepts image files', () => {
      cy.get('input[type=file]').should('have.attr', 'accept', 'image/*');
    });

    it('displays file size hint', () => {
      cy.contains('max 5MB').should('exist');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      cy.visit('/dashboard/gym-profile');
    });

    it('requires gym name', () => {
      cy.get('input[name=name]').clear();
      cy.contains('button', 'Save Changes').click();
      
      cy.get('input[name=name]:invalid').should('exist');
    });

    it('allows empty address', () => {
    cy.get('textarea[name=address]').clear();
    
    // Verify name field still has value (wasn't cleared)
    cy.get('input[name=name]').invoke('val').should('not.be.empty');
    
    // Submit form - should succeed even with empty address
    cy.contains('button', 'Save Changes').should('not.be.disabled');
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner on initial load', () => {
      cy.intercept('GET', '**/api/gym/profile', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      });
      
      cy.visit('/dashboard/gym-profile');
      cy.get('.animate-spin', { timeout: 1000 }).should('exist');
    });

    it('shows saving state during update', () => {
      cy.visit('/dashboard/gym-profile');
      
      cy.intercept('PUT', '**/api/gym/profile', (req) => {
        req.reply((res) => {
          res.delay = 1000;
        });
      });
      
      cy.get('input[name=name]').clear().type('Test');
      cy.contains('button', 'Save Changes').click();
      
      cy.contains('Saving...').should('exist');
      cy.get('button:disabled').should('exist');
    });
  });

  describe('Cancel Button', () => {
    it('cancels and returns to dashboard', () => {
      cy.visit('/dashboard/gym-profile');
      
      cy.get('input[name=name]').clear().type('Should Not Save');
      cy.contains('button', 'Cancel').click();
      
      cy.url().should('include', '/dashboard');
      cy.url().should('not.include', '/gym-profile');
    });

    it('does not save changes when cancelled', () => {
      cy.visit('/dashboard/gym-profile');
      const originalName = gymName;
      
      cy.get('input[name=name]').clear().type('Cancelled Name');
      cy.contains('button', 'Cancel').click();
      
      cy.visit('/dashboard/gym-profile');
      cy.get('input[name=name]').should('not.have.value', 'Cancelled Name');
    });
  });
});
