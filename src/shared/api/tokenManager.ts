const TOKEN_KEY = 'uss_admin_access_token';
const NAME_KEY = 'uss_admin_name';

export const tokenManager = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getName: () => localStorage.getItem(NAME_KEY),
  set: (token: string, name: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(NAME_KEY, name);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
  },
};
