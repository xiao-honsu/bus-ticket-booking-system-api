// Helper to use faker in Jest tests (workaround for ESM issues)
export const createFakeEmail = () => {
  const random = Math.random().toString(36).substring(7);
  return `test.${random}@example.com`;
};

export const createFakeName = () => {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
};

export const createFakePhone = () => {
  return `0${Math.floor(100000000 + Math.random() * 900000000)}`;
};

export const createFakeLicense = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = Math.floor(100000 + Math.random() * 900000);
  return `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${numbers}`;
};

export const faker = {
  internet: {
    email: () => createFakeEmail(),
  },
  person: {
    fullName: () => createFakeName(),
  },
  phone: {
    number: () => createFakePhone(),
  },
  string: {
    alphanumeric: (length: number) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      return result;
    },
  },
};
