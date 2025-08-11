import { Inter } from "next/font/google";
import { AuthGetCurrentUserServer } from "@/utils/amplify-utils";
import AuthenticatorWrapper from "@/app/AuthenticatorWrapper";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default async function LayoutWrapper({ children }: LayoutWrapperProps) {
  const user = await AuthGetCurrentUserServer();

  return (
    <div className={`min-h-screen bg-background font-sans antialiased ${inter.className}`}>
      <AuthenticatorWrapper>
        {user && <Header />}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </AuthenticatorWrapper>
    </div>
  );
}
