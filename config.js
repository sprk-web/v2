export const SITE_CONFIG = {
  name: "SPRK-Web",
  logo: "./images/logo-placeholder.svg",
  simulatorPath: "/simulator/",
  navigation: [
    { label: "Home", href: "/" },
    { label: "Simulations", href: "/simulator/" },
    { label: "Tests", href: "/test/" },
    { label: "Focus timer", href: "/tools/timer/" },
    { label: "Library", href: "/tools/library/" },
  ],
  controls: {
    showSiteMenu: true,
    showMainAuth: true,
    showThemeSelector: true,
    showAccentPicker: true,
    stickyHeader: true
  },
  theme: {
    defaultMode: "system",
    defaultAccent: "#147d77",
    accents: [
      { label: "Teal", value: "#176b66" },
      { label: "Indigo", value: "#5145e8" },
      { label: "Blue", value: "#2563eb" },
      { label: "Violet", value: "#7c3aed" },
      { label: "Rose", value: "#e11d48" },
      { label: "Amber", value: "#b45309" },
      { label: "Emerald", value: "#059669" }
    ]
  }
};

// Browser-facing configuration only. Never put a service-role or secret key here.
export const SUPABASE_PROJECTS = {
  main: {
    url: "https://eliwtvmovfykydbhbgvs.supabase.co",
    anonKey: "sb_publishable_TrXEA94Ci3GzcVHf-votMw_0Yxrl-BT"
  },
  simulator: {
    url: "https://owguhymyzrwawibzetxd.supabase.co",
    anonKey: "sb_publishable_43f9RoG0zdAtfS8_h5B4KQ_o2gm8MbO"
  }
};

export const SUPABASE_URL = SUPABASE_PROJECTS.main.url;
export const SUPABASE_ANON_KEY = SUPABASE_PROJECTS.main.anonKey;
export const SIMULATOR_SUPABASE_URL = SUPABASE_PROJECTS.simulator.url;
export const SIMULATOR_SUPABASE_ANON_KEY = SUPABASE_PROJECTS.simulator.anonKey;
