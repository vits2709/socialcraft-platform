import { getSessionUser, isAdmin } from "@/lib/auth";
import AdminNavbar from "@/components/AdminNavbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const showLogout = user ? await isAdmin(user.id) : false;

  return (
    <div style={{ background: "#F8F9FA", minHeight: "100vh" }}>
      <AdminNavbar showLogout={showLogout} />
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "28px 20px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
