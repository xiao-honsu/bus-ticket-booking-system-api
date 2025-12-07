import { IUser } from '../models/user.model';

export {};

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
