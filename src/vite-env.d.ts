/// <reference types="vite/client" />

interface Window {
  gapi?: {
    client?: {
      load: (api: string, version: string) => Promise<void>;
      init: (options: any) => Promise<void>;
      gmail?: any;
      getToken: () => any;
      setToken: (token: any) => void;
    };
    auth?: {
      getToken: () => any;
      setToken: (token: any) => void;
    };
    load: (api: string, callback: () => void) => void;
  };
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (options: any) => any;
        hasGrantedAllScopes: (token: any, ...scopes: string[]) => boolean;
      }
    }
  };
}
