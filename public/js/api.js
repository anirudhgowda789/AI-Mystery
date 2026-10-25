/**
 * AI Mystery Room - Client API Layer
 * Connects the frontend to Express backend endpoints.
 */

const API_BASE = '/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || `HTTP error ${response.status}`);
        error.status = response.status;
        error.code = data.code || 'HTTP_ERROR';
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] [${options.method || 'GET'} ${endpoint}]`, err);
      throw err;
    }
  }

  // Health check
  async getHealth() {
    return this.request('/health');
  }

  // Generate a new mystery case
  async generateCase({ theme = 'Victorian Noir', difficulty = 'medium', forceMock = false } = {}) {
    return this.request('/cases/generate', {
      method: 'POST',
      body: JSON.stringify({ theme, difficulty, forceMock })
    });
  }

  // List existing cases
  async getCases() {
    return this.request('/cases');
  }

  // Get specific case by ID
  async getCase(caseId) {
    return this.request(`/cases/${caseId}`);
  }

  // Start a new session for a case
  async createSession(caseId) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ caseId })
    });
  }

  // Restore existing session
  async getSession(sessionId) {
    return this.request(`/sessions/${sessionId}`);
  }

  // Record evidence inspection
  async viewEvidence(sessionId, evidenceId) {
    return this.request(`/sessions/${sessionId}/evidence/${evidenceId}/view`, {
      method: 'POST'
    });
  }

  // Hand down formal indictment / accusation
  async submitAccusation(sessionId, suspectId, rationale = '') {
    return this.request(`/sessions/${sessionId}/accuse`, {
      method: 'POST',
      body: JSON.stringify({ suspectId, rationale })
    });
  }

  // Declassify classified solution (authorized for solved or failed cases)
  async getSolution(sessionId) {
    return this.request(`/sessions/${sessionId}/solution`);
  }

  // Save investigator field notes
  async saveNotes(sessionId, notes) {
    return this.request(`/sessions/${sessionId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
  }
}

window.apiClient = new ApiClient();
