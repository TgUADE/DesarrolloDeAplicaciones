import client from './client';

export const authApi = {
  register: (formData: FormData) =>
    client.post('/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  completeRegistration: (data: { token: string; email: string; password: string }) =>
    client.post('/auth/complete-registration', data),

  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data),

  logout: () => client.post('/auth/logout'),

  me: () => client.get('/auth/me'),

  refresh: () => client.post('/auth/refresh'),
};
