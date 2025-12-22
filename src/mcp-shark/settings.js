const { MCP_SHARK_SETTINGS_URL } = require("../constants");
const { httpGetJson } = require("./http");

const createMcpSharkSettingsCache = () => {
  return {
    value: null,
    fetchedAtMs: 0,
  };
};

const fetchMcpSharkSettings = async ({ cache } = {}) => {
  const settings = await httpGetJson(MCP_SHARK_SETTINGS_URL, { timeoutMs: 2000 });

  if (cache) {
    cache.value = settings;
    cache.fetchedAtMs = Date.now();
  }

  return settings;
};

const isMcpSharkSetupComplete = async () => {
  try {
    const settings = await fetchMcpSharkSettings();
    // Check if setup is complete - typically means servers are configured
    // Settings might have a servers array or isSetupComplete flag
    // For now, check if servers array exists and has items, or if there's an isSetupComplete flag
    if (settings.servers && Array.isArray(settings.servers) && settings.servers.length > 0) {
      return true;
    }
    if (settings.isSetupComplete === true) {
      return true;
    }
    // If no servers configured, setup is not complete
    return false;
  } catch (_error) {
    // If we can't fetch settings, assume setup is not complete
    return false;
  }
};

module.exports = {
  createMcpSharkSettingsCache,
  fetchMcpSharkSettings,
  isMcpSharkSetupComplete,
};


