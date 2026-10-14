import { createContext, useContext } from 'react';

export const DEFAULT_SETTINGS = {
  display_name: 'Operator', theme: 'cybercore', language: 'both', daily_goal_minutes: 60, weekly_goal_minutes: 300,
  focus_min: 25, short_break_min: 5, long_break_min: 15, sound: true, notifications: false,
  github_url: '', portfolio_intro: '', portfolio_public: false, preferred_categories: [],
};
export const SettingsCtx = createContext({ settings: DEFAULT_SETTINGS, setSettings: () => {} });
export const useSettings = () => useContext(SettingsCtx);
