export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  full_name?: string;
}