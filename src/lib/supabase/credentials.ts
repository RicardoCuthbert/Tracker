export function credentials(form: unknown) {
  if (!(form instanceof FormData)) return null;
  const email = form.get('email');
  const password = form.get('password');
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const address = email.trim();
  if (address.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || !password || password.length > 1024) return null;
  return { email: address, password };
}
