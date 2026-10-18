// app/app/settings/page.tsx
import Protected from "../Protected";
import AppShell from "../AppShell";
import Settings from "./Settings";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Protected>
      <AppShell>
        <Settings />
      </AppShell>
    </Protected>
  );
}
