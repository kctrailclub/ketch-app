import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear tokens and redirect to login — but not if we're already on the login endpoint
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginAttempt = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getMe = () =>
  api.get('/auth/me');

export const setPassword = (token, password) =>
  api.post('/auth/set-password', { token, password });

export const changePassword = (current_password, new_password) =>
  api.post('/auth/change-password', { current_password, new_password });

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

// ── Users ─────────────────────────────────────────────────────
export const getUsers = () =>
  api.get('/users/');

export const getUser = (id) =>
  api.get(`/users/${id}`);

export const createUser = (data) =>
  api.post('/users/', data);

export const updateUser = (id, data) =>
  api.patch(`/users/${id}`, data);

export const resendInvite = (id) =>
  api.post(`/users/${id}/resend-invite`);

// ── Hours ─────────────────────────────────────────────────────
export const getHours = (params) =>
  api.get('/hours/', { params });

export const getPendingHours = () =>
  api.get('/hours/pending');

export const submitHours = (data) =>
  api.post('/hours/', data);

export const reviewHours = (id, status, status_note) =>
  api.post(`/hours/${id}/review`, { status, status_note });

export const updateHours = (id, data) =>
  api.patch(`/hours/${id}`, data);

export const deleteHours = (id) =>
  api.delete(`/hours/${id}`);

export const approveAllHours = () =>
  api.post('/hours/approve-all');

// ── Households ────────────────────────────────────────────────
export const getHouseholds = () =>
  api.get('/households/');

export const getHousehold = (id) =>
  api.get(`/households/${id}`);

export const createHousehold = (data) =>
  api.post('/households/', data);

export const updateHousehold = (id, data) =>
  api.patch(`/households/${id}`, data);

export const requestToJoin = (household_id) =>
  api.post('/households/join-request', { household_id });

export const approveJoin = (householdId, userId) =>
  api.post(`/households/${householdId}/members/${userId}/approve`);

export const rejectJoin = (householdId, userId) =>
  api.post(`/households/${householdId}/members/${userId}/reject`);

export const removeMember = (householdId, userId) =>
  api.delete(`/households/${householdId}/members/${userId}`);

// ── Projects ──────────────────────────────────────────────────
export const getProjects = (activeOnly = false) =>
  api.get('/projects/', { params: { active_only: activeOnly } });

export const createProject = (data) =>
  api.post('/projects/', data);

export const updateProject = (id, data) =>
  api.patch(`/projects/${id}`, data);

// ── Settings / Rewards ────────────────────────────────────────
export const getRewardSettings = () =>
  api.get('/settings/rewards');

export const getRewardThreshold = () =>
  api.get('/settings/rewards/threshold');

export const updateRewardSettings = (data) =>
  api.post('/settings/rewards', data);

export const sendRewardEmails = (email_type, household_ids) =>
  api.post('/settings/rewards/send', { email_type, household_ids });
export const getNotifications = (unreadOnly = false) =>
  api.get('/notifications/', { params: { unread_only: unreadOnly } });

export const markRead = (id) =>
  api.post(`/notifications/${id}/read`);

export const markAllRead = () =>
  api.post('/notifications/read-all');

export const submitRegistration = (data) =>
  api.post('/registrations/', data);

export const getRegistrations = () =>
  api.get('/registrations/');

export const approveRegistration = (id) =>
  api.post(`/registrations/${id}/approve`);

export const rejectRegistration = (id) =>
  api.post(`/registrations/${id}/reject`);

// ── Reports / Natural Language Query ─────────────────────────
export const queryReports = (question) =>
  api.post('/reports/query', { question });
