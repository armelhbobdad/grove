import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getConfig, type Config } from '../api/config';
import { checkAllDependencies } from '../api';


interface ConfigContextValue {
  config: Config | null;
  loading: boolean;
  refresh: () => Promise<void>;
  terminalAvailable: boolean;
  updateAvailability: (terminal: boolean) => void;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminalAvailable, setTerminalAvailable] = useState(true);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getConfig();
      setConfig(cfg);
      return cfg;
    } catch (error) {
      console.error('Failed to load config:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = useCallback(async (cfg: Config | null) => {
    try {
      const envResult = await checkAllDependencies();
      // Terminal: direct mode always available, or tmux/zellij installed
      const isDirectMode = cfg?.web?.terminal_mode === 'direct';
      const tmux = envResult.dependencies.find(d => d.name === 'tmux')?.installed ?? false;
      const zellij = envResult.dependencies.find(d => d.name === 'zellij')?.installed ?? false;
      setTerminalAvailable(isDirectMode || tmux || zellij);
    } catch {
      // On error, keep defaults
    }
  }, []);

  const updateAvailability = useCallback((terminal: boolean) => {
    setTerminalAvailable(terminal);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const cfg = await getConfig();
      setConfig(cfg);
      await checkAvailability(cfg);
    } catch (error) {
      console.error('Failed to refresh config:', error);
    }
  }, [checkAvailability]);

  useEffect(() => {
    loadConfig().then(cfg => checkAvailability(cfg));
  }, [checkAvailability]);

  return (
    <ConfigContext.Provider value={{
      config,
      loading,
      refresh,
      terminalAvailable,
      updateAvailability,
    }}>
      {children}
    </ConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
