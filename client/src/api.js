const API_URL = "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("authToken");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const api = {
  getAllSets: () => request("/question-sets"),
  getSet: (key) => request(`/question-sets/${key}`),
  createSet: (key, name) =>
    request("/question-sets", { method: "POST", body: JSON.stringify({ key, name }) }),
  updateSetMeta: (key, name) =>
    request(`/question-sets/${key}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteSet: (key) => request(`/question-sets/${key}`, { method: "DELETE" }),
  addQuestion: (key, question) =>
    request(`/question-sets/${key}/questions`, { method: "POST", body: JSON.stringify(question) }),
  updateQuestion: (key, questionId, updates) =>
    request(`/question-sets/${key}/questions/${questionId}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    }),
  deleteQuestion: (key, questionId) =>
    request(`/question-sets/${key}/questions/${questionId}`, { method: "DELETE" }),

  // Auth
  register: (username, password) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  getMe: () => request("/account/me"),

  // Avatars
  getAvatarCatalog: () => request("/avatars"),
  purchaseAvatar: (avatarId) =>
    request(`/account/avatars/${avatarId}/purchase`, { method: "POST" }),
  equipAvatar: (avatarId) =>
    request(`/account/avatars/${avatarId}/equip`, { method: "POST" })
};
