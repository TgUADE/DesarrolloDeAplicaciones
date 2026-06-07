import client from './client';

export const submissionApi = {
  create: (formData: FormData) =>
    client.post('/submissions', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getById: (id: string) => client.get(`/submissions/${id}`),
  userAccept: (id: string) => client.patch(`/submissions/${id}/user-accept`),
  userReject: (id: string) => client.patch(`/submissions/${id}/user-reject`),
};
