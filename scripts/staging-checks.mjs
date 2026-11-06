export function assessAuthSettings(response, data) {
  const googleEnabled = data?.external?.google === true;
  return { status: response.ok && googleEnabled ? 'PASS' : 'FAIL', googleEnabled };
}

export function assessGoogleRedirect(response, projectUrl) {
  let target;
  try { const location = response.headers.get('location'); target = location && new URL(location); } catch { /* no raw response output */ }
  const redirectsToGoogle = target?.hostname === 'accounts.google.com';
  const callbackMatchesProject = target?.searchParams.get('redirect_uri') === `${projectUrl}/auth/v1/callback`;
  return { status: redirectsToGoogle && callbackMatchesProject && response.status === 302 ? 'PASS' : 'FAIL', redirectsToGoogle, callbackMatchesProject };
}
