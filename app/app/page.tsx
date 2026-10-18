// app/app/page.tsx
import Protected from "./Protected";
import AppShell from "./AppShell";
import Workspace from "./Workspace";

export const metadata = { title: "Weekly prep" };

export default function AppPage() {
  return (
    <Protected>
      <AppShell>
        <Workspace />
      </AppShell>
    </Protected>
  );
}
