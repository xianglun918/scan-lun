import { ref, type Ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type UpdateStatus =
  | "idle" | "checking" | "available" | "downloading"
  | "downloaded" | "up-to-date" | "error";

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  notes: string | null;
  errorMessage: string | null;
}

interface UpdateAvailablePayload {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
  notes: string | null;
}

interface UpdateErrorPayload {
  kind: string;
  message: string;
}

interface UpdateDownloadedPayload extends UpdateAvailablePayload {}

export interface UpdaterApi {
  state: Ref<UpdateState>;
  check: () => Promise<void>;
  install: () => Promise<void>;
  restart: () => Promise<void>;
}

const initialState = (): UpdateState => ({
  status: "idle",
  currentVersion: "",
  latestVersion: null,
  notes: null,
  errorMessage: null,
});

let singleton: UpdaterApi | null = null;

function createUpdater(): UpdaterApi {
  const state = ref<UpdateState>(initialState());
  const unlistens: UnlistenFn[] = [];

  function setError(message: string) {
    state.value = { ...state.value, status: "error", errorMessage: message };
  }

  function applyInfo(p: UpdateAvailablePayload, status: UpdateStatus) {
    state.value = {
      status,
      currentVersion: p.currentVersion,
      latestVersion: p.latestVersion,
      notes: p.notes,
      errorMessage: null,
    };
  }

  async function attachListeners(): Promise<void> {
    unlistens.push(
      await listen<UpdateAvailablePayload>("update-available", (e) => {
        applyInfo(e.payload, "available");
      }),
    );
    unlistens.push(
      await listen<UpdateDownloadedPayload>("update-downloaded", (e) => {
        applyInfo(e.payload, "downloaded");
      }),
    );
    unlistens.push(
      await listen<UpdateErrorPayload>("update-error", (e) => {
        setError(e.payload.message);
      }),
    );
  }

  async function check(): Promise<void> {
    state.value = { ...state.value, status: "checking", errorMessage: null };
    try {
      const info = await invoke<UpdateAvailablePayload>("check_update");
      applyInfo(info, info.available ? "available" : "up-to-date");
    } catch (e) {
      setError(String(e));
    }
  }

  async function install(): Promise<void> {
    state.value = { ...state.value, status: "downloading" };
    try {
      await invoke("install_update");
      // 状态会被 update-downloaded 事件覆盖
    } catch (e) {
      setError(String(e));
    }
  }

  async function restart(): Promise<void> {
    try {
      await invoke("restart_app");
    } catch (e) {
      setError(String(e));
    }
  }

  void attachListeners();

  return { state, check, install, restart };
}

export function useUpdater(): UpdaterApi {
  if (!singleton) {
    singleton = createUpdater();
  }
  return singleton;
}
