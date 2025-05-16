import bcrypt from "bcrypt";
const SALT_ROUNDS = 10;

export const passwordHash = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const passwordCompare = async (
  password: string,
  hashPasword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashPasword);
};
