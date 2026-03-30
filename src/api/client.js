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

export const logout = (refresh_token) =>
  api.post('/auth/logout', { refresh_token });

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

export const deleteHours = (id, reason) =>
  api.delete(`/hours/${id}`, { data: reason ? { reason } : undefined });

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
export const getRewardSettings = (year) =>
  api.get('/settings/rewards', { params: year ? { year } : {} });

export const getRewardThreshold = () =>
  api.get('/settings/rewards/threshold');

export const updateRewardSettings = (data) =>
  api.post('/settings/rewards', data);

export const sendRewardEmails = (email_type, household_ids, year) =>
  api.post('/settings/rewards/send', { email_type, household_ids, year });

export const saveRewardTag = (household_id, year, tag_number) =>
  api.post('/settings/rewards/tag', { household_id, year, tag_number });

export const getRewardTags = (year) =>
  api.get('/settings/rewards/tags', { params: { year } });

export const autoAssignTags = (start_tag, end_tag, year) =>
  api.post('/settings/rewards/auto-assign-tags', { start_tag, end_tag, year });
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

export const approveRegistration = (id, body = {}) =>
  api.post(`/registrations/${id}/approve`, body);

export const rejectRegistration = (id) =>
  api.post(`/registrations/${id}/reject`);

// ── Reports / Natural Language Query ─────────────────────────
export const queryReports = (question) =>
  api.post('/reports/query', { question });

// ── Audit ────────────────────────────────────────────────────
export const getAuditLogs = (params) =>
  api.get('/audit/', { params });

// ── Resources ────────────────────────────────────────────────
export const getSponsors = (includeInactive = false) =>
  api.get('/resources/sponsors', { params: { include_inactive: includeInactive } });

export const createSponsor = (data) =>
  api.post('/resources/sponsors', data);

export const updateSponsor = (id, data) =>
  api.patch(`/resources/sponsors/${id}`, data);

export const deleteSponsor = (id) =>
  api.delete(`/resources/sponsors/${id}`);

export const getResourceUpdates = (includeInactive = false, includeExpired = false) =>
  api.get('/resources/updates', { params: { include_inactive: includeInactive, include_expired: includeExpired } });

export const createResourceUpdate = (data) =>
  api.post('/resources/updates', data);

export const editResourceUpdate = (id, data) =>
  api.patch(`/resources/updates/${id}`, data);

export const deleteResourceUpdate = (id) =>
  api.delete(`/resources/updates/${id}`);

export const getResourceDocuments = (includeInactive = false) =>
  api.get('/resources/documents', { params: { include_inactive: includeInactive } });

export const createResourceDocument = (data) =>
  api.post('/resources/documents', data);

export const updateResourceDocument = (id, data) =>
  api.patch(`/resources/documents/${id}`, data);

export const deleteResourceDocument = (id) =>
  api.delete(`/resources/documents/${id}`);

export const bulkCreateHouseholds = () => api.post('/users/bulk-households');

// ── Strava ──────────────────────────────────────────────────
export const getStravaAuthUrl = () => api.get('/strava/auth-url');
export const stravaCallback = (code) => api.post('/strava/callback', { code });
export const getStravaConnection = () => api.get('/strava/connection');
export const disconnectStrava = () => api.delete('/strava/connection');
export const getStravaSegments = (includeInactive = false) =>
  api.get('/strava/segments', { params: { include_inactive: includeInactive } });
export const addStravaSegment = (data) => api.post('/strava/segments', data);
export const updateStravaSegment = (id, data) => api.patch(`/strava/segments/${id}`, data);
export const deleteStravaSegment = (id) => api.delete(`/strava/segments/${id}`);
export const refreshStravaSegment = (id) => api.post(`/strava/segments/${id}/refresh`);
export const syncStravaEfforts = () => api.post('/strava/sync');
export const getSegmentLeaderboard = (segmentId) => api.get(`/strava/segments/${segmentId}/leaderboard`);
export const getMySegmentEfforts = (segmentId) => api.get(`/strava/segments/${segmentId}/my-efforts`);

// Strava Trails
export const getStravaTrails = (year, includeInactive = false) =>
  api.get('/strava/trails', { params: { year, include_inactive: includeInactive } });
export const createStravaTrail = (data) => api.post('/strava/trails', data);
export const updateStravaTrail = (id, data) => api.patch(`/strava/trails/${id}`, data);
export const deleteStravaTrail = (id) => api.delete(`/strava/trails/${id}`);
export const addSegmentToTrail = (trailId, data) => api.post(`/strava/trails/${trailId}/segments`, data);
export const removeSegmentFromTrail = (trailId, segmentId) => api.delete(`/strava/trails/${trailId}/segments/${segmentId}`);
export const getTrailsChallenge = (year) => api.get('/strava/trails-challenge', { params: { year } });
export const getTrailsChallengeLeaderboard = (year) => api.get('/strava/trails-challenge/leaderboard', { params: { year } });

// Push notifications
export const getVapidPublicKey = () => api.get('/push/vapid-public-key');
export const subscribePush = (subscription) => api.post('/push/subscribe', subscription);
export const unsubscribePush = (subscription) => api.post('/push/unsubscribe', subscription);
