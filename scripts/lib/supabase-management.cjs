async function managementFetch(token, apiPath, options = {}) {
  const response = await fetch(`https://api.supabase.com/v1${apiPath}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${apiPath} returned HTTP ${response.status}: ${text.slice(0, 1000)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function runManagementQuery(token, ref, query) {
  return managementFetch(token, `/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

module.exports = {
  managementFetch,
  runManagementQuery,
};
