import LoginPageClient from "@/components/LoginPageClient";

type LoginPageProps = {
  searchParams?: {
    redirect?: string | string[];
  };
};

function sanitizeRedirectPath(path: string | undefined) {
  if (!path) {
    return "/";
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }

  return path;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirectValue = searchParams?.redirect;
  const rawRedirectPath = Array.isArray(redirectValue) ? redirectValue[0] : redirectValue;
  const redirectPath = sanitizeRedirectPath(rawRedirectPath);

  return <LoginPageClient redirectPath={redirectPath} />;
}
