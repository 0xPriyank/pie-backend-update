type AuthenticatedUser = {
  email: string;
  id: string;
  isOnboardingComplete?: boolean;
};

declare module "express" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export {};
